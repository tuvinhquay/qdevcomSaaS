"use client";

import { db } from "@/services/firebase";
import { collection, getDocs } from "firebase/firestore";
import { type ProductionOrder } from "@/types/production";
import { type WarehouseItem } from "@/types/warehouse";

export type TodayProductionSummary = {
  totalOutput: number;
  runningOrders: number;
  lateOrders: number;
};

export type LowStockItem = WarehouseItem & {
  minStock: number;
};

export type WorkerPerformance = {
  worker: string;
  output: number;
  progress: number;
};

type ProductionOrderDoc = Partial<ProductionOrder> & {
  dueDate?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

type WarehouseDoc = Partial<WarehouseItem> & {
  minStock?: number | null;
};

function assertReady(companyId: string) {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }

  if (!companyId.trim()) {
    throw new Error("Company ID is required for AI analysis.");
  }
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInToday(timestamp: number): boolean {
  if (!timestamp) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return timestamp >= start.getTime() && timestamp < end.getTime();
}

async function getProductionOrderDocs(companyId: string): Promise<ProductionOrderDoc[]> {
  const productionRef = collection(db!, "companies", companyId, "productionOrders");
  const snapshot = await getDocs(productionRef);
  return snapshot.docs.map((item) => item.data() as ProductionOrderDoc);
}

export async function getTodayProduction(companyId: string): Promise<TodayProductionSummary> {
  assertReady(companyId);

  const productionOrders = await getProductionOrderDocs(companyId);
  const now = Date.now();

  let totalOutput = 0;
  let runningOrders = 0;
  let lateOrders = 0;

  for (const order of productionOrders) {
    const producedQuantity = safeNumber(order.producedQuantity);
    const status = String(order.status ?? "");
    const updatedAt = safeNumber(order.updatedAt ?? order.createdAt);
    const dueDate = safeNumber(order.dueDate);

    // Giả định sản lượng "hôm nay" dựa trên đơn được cập nhật trong ngày hiện tại.
    if (isInToday(updatedAt)) {
      totalOutput += producedQuantity;
    }

    if (status === "in_progress") {
      runningOrders += 1;
    }

    if (dueDate > 0 && dueDate < now && status !== "completed" && status !== "cancelled") {
      lateOrders += 1;
    }
  }

  return {
    totalOutput,
    runningOrders,
    lateOrders,
  };
}

export async function getLowStock(companyId: string): Promise<LowStockItem[]> {
  assertReady(companyId);

  const warehouseRef = collection(db!, "companies", companyId, "warehouse");
  const snapshot = await getDocs(warehouseRef);

  const lowStock: LowStockItem[] = [];

  for (const item of snapshot.docs) {
    const data = item.data() as WarehouseDoc;
    const quantity = safeNumber(data.quantity);
    const minStock = safeNumber(data.minStock);

    if (minStock > 0 && quantity < minStock) {
      lowStock.push({
        id: item.id,
        companyId,
        name: String(data.name ?? ""),
        SKU: String(data.SKU ?? ""),
        quantity,
        minStock,
        location: String(data.location ?? ""),
        status:
          (data.status as WarehouseItem["status"] | undefined) ?? "in_stock",
        createdBy: String(data.createdBy ?? ""),
        assignedTo: (data.assignedTo as string | undefined) ?? undefined,
        createdAt: safeNumber(data.createdAt),
        updatedAt: safeNumber(data.updatedAt),
        notes: (data.notes as string | undefined) ?? undefined,
      });
    }
  }

  return lowStock;
}

export async function getWorkerPerformance(companyId: string): Promise<WorkerPerformance[]> {
  assertReady(companyId);

  const productionOrders = await getProductionOrderDocs(companyId);
  const workerMap = new Map<string, { output: number; target: number }>();

  for (const order of productionOrders) {
    const worker = (order.assignedTo ?? "Chua gan").trim() || "Chua gan";
    const producedQuantity = safeNumber(order.producedQuantity);
    const quantity = safeNumber(order.quantity);

    const current = workerMap.get(worker) ?? { output: 0, target: 0 };
    current.output += producedQuantity;
    current.target += quantity;
    workerMap.set(worker, current);
  }

  return Array.from(workerMap.entries())
    .map(([worker, stats]) => {
      const progress = stats.target > 0 ? (stats.output / stats.target) * 100 : 0;
      return {
        worker,
        output: stats.output,
        progress: Number(progress.toFixed(1)),
      };
    })
    .sort((a, b) => b.output - a.output);
}
