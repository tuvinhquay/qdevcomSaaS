import { loadAppConfig } from "@/lib/app_config";
import type { AppSettings } from "@/lib/default_settings";
import { db } from "@/services/firebase";
import { collection, doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

type WorkOrderDoc = {
  status?: string;
  quantity?: number;
  targetQuantity?: number;
  producedQuantity?: number;
  progress?: number;
};

type ProductionLogDoc = {
  quantity?: number;
  income?: number;
  createdAt?: number | { seconds?: number; toMillis?: () => number };
};

type WarehouseItemDoc = {
  itemName?: string;
  name?: string;
  quantityRemaining?: number;
};

type WorkerDoc = {
  name?: string;
  workerName?: string;
  monthlyQuantity?: number;
  monthlyIncome?: number;
};

export type LowStockItem = {
  id: string;
  itemName: string;
  quantityRemaining: number;
};

export type TopWorker = {
  id: string;
  workerName: string;
  monthlyQuantity: number;
  monthlyIncome: number;
};

export type ProductionProgress = {
  target: number;
  completed: number;
  percent: number;
};

export type DashboardStats = {
  totalOrders: number;
  completedOrders: number;
  delayedOrders: number;
  totalProductionToday: number;
  totalIncomeToday: number;
  lowStockCount: number;
  topWorkers: TopWorker[];
  productionProgress: ProductionProgress;
  lowStockItems: LowStockItem[];
};

type DashboardRealtimePayload = {
  stats: DashboardStats;
  settings: AppSettings;
};

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  completedOrders: 0,
  delayedOrders: 0,
  totalProductionToday: 0,
  totalIncomeToday: 0,
  lowStockCount: 0,
  topWorkers: [],
  productionProgress: {
    target: 0,
    completed: 0,
    percent: 0,
  },
  lowStockItems: [],
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toTimestampMs(value: unknown): number {
  if (typeof value === "number") return value;

  if (value && typeof value === "object") {
    const typedValue = value as { toMillis?: () => number; seconds?: number };

    if (typeof typedValue.toMillis === "function") {
      return typedValue.toMillis();
    }

    if (typeof typedValue.seconds === "number") {
      return typedValue.seconds * 1000;
    }
  }

  return 0;
}

function startOfTodayMs() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

export function getLowStockItems(warehouseItems: LowStockItem[], minStock: number): LowStockItem[] {
  return warehouseItems.filter((item) => item.quantityRemaining < minStock);
}

export function getTopWorkers(workers: TopWorker[]): TopWorker[] {
  return [...workers].sort((a, b) => b.monthlyQuantity - a.monthlyQuantity).slice(0, 5);
}

export function getProductionToday(logs: ProductionLogDoc[]): number {
  const threshold = startOfTodayMs();

  return logs.reduce((sum, log) => {
    const createdAt = toTimestampMs(log.createdAt);
    if (createdAt < threshold) return sum;
    return sum + toNumber(log.quantity);
  }, 0);
}

export function getIncomeToday(logs: ProductionLogDoc[]): number {
  const threshold = startOfTodayMs();

  return logs.reduce((sum, log) => {
    const createdAt = toTimestampMs(log.createdAt);
    if (createdAt < threshold) return sum;
    return sum + toNumber(log.income);
  }, 0);
}

export function getDashboardStats(input: {
  workOrders: WorkOrderDoc[];
  productionLogs: ProductionLogDoc[];
  warehouseItems: LowStockItem[];
  workers: TopWorker[];
  settings: AppSettings;
}): DashboardStats {
  const { workOrders, productionLogs, warehouseItems, workers, settings } = input;

  const totalOrders = workOrders.length;
  const completedOrders = workOrders.filter((order) => order.status === "completed").length;
  const delayedOrders = workOrders.filter((order) => order.status === "delayed").length;

  const target = workOrders.reduce(
    (sum, order) => sum + toNumber(order.targetQuantity || order.quantity),
    0,
  );
  const completedByOrder = workOrders.reduce((sum, order) => sum + toNumber(order.producedQuantity), 0);
  const completedByLogs = productionLogs.reduce((sum, log) => sum + toNumber(log.quantity), 0);
  const completed = Math.max(completedByOrder, completedByLogs);
  const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  const minStock = settings.warehouse.minStock;
  const lowStockItems = getLowStockItems(warehouseItems, minStock);

  return {
    totalOrders,
    completedOrders,
    delayedOrders,
    totalProductionToday: getProductionToday(productionLogs),
    totalIncomeToday: getIncomeToday(productionLogs),
    lowStockCount: lowStockItems.length,
    topWorkers: getTopWorkers(workers),
    productionProgress: {
      target,
      completed,
      percent,
    },
    lowStockItems,
  };
}

export async function listenDashboardStats(
  tenantId: string,
  onData: (payload: DashboardRealtimePayload) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  if (!db) {
    throw new Error("Firestore chua san sang. Kiem tra bien moi truong Firebase.");
  }

  let settings = await loadAppConfig(tenantId);
  let workOrders: WorkOrderDoc[] = [];
  let productionLogs: ProductionLogDoc[] = [];
  let warehouseItems: LowStockItem[] = [];
  let workers: TopWorker[] = [];

  const emit = () => {
    const stats = getDashboardStats({
      workOrders,
      productionLogs,
      warehouseItems,
      workers,
      settings,
    });

    onData({ stats: stats ?? EMPTY_STATS, settings });
  };

  const unsubscribers: Unsubscribe[] = [];

  unsubscribers.push(
    onSnapshot(
      doc(db, "tenants", tenantId, "settings", "config"),
      (snapshot) => {
        if (snapshot.exists()) {
          settings = {
            ...settings,
            ...(snapshot.data() as Partial<AppSettings>),
          };
        }
        emit();
      },
      (error) => onError?.(error as Error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, "tenants", tenantId, "work_orders"),
      (snapshot) => {
        workOrders = snapshot.docs.map((item) => item.data() as WorkOrderDoc);
        emit();
      },
      (error) => onError?.(error as Error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, "tenants", tenantId, "production_logs"),
      (snapshot) => {
        productionLogs = snapshot.docs.map((item) => item.data() as ProductionLogDoc);
        emit();
      },
      (error) => onError?.(error as Error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, "tenants", tenantId, "warehouse_items"),
      (snapshot) => {
        warehouseItems = snapshot.docs.map((item) => ({
          id: item.id,
          itemName: String(item.data().itemName || item.data().name || "Unknown item"),
          quantityRemaining: toNumber(item.data().quantityRemaining),
        }));
        emit();
      },
      (error) => onError?.(error as Error),
    ),
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, "tenants", tenantId, "workers"),
      (snapshot) => {
        workers = snapshot.docs.map((item) => ({
          id: item.id,
          workerName: String(item.data().name || item.data().workerName || "Worker"),
          monthlyQuantity: toNumber(item.data().monthlyQuantity),
          monthlyIncome: toNumber(item.data().monthlyIncome),
        }));
        emit();
      },
      (error) => onError?.(error as Error),
    ),
  );

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
