type Severity = "low" | "medium" | "high";
type DelayRisk = "low" | "medium" | "high";

type ProductionLogRecord = {
  workerId?: string;
  workerName?: string;
  quantity?: number;
  createdAt?: number | { seconds?: number; toMillis?: () => number };
};

type WorkOrderRecord = {
  status?: string;
  targetQuantity?: number;
  quantity?: number;
  completedQuantity?: number;
  dueDate?: number;
};

type WarehouseRecord = {
  quantityRemaining?: number;
  minStock?: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    const typed = value as { seconds?: number; toMillis?: () => number };
    if (typeof typed.toMillis === "function") return typed.toMillis();
    if (typeof typed.seconds === "number") return typed.seconds * 1000;
  }
  return 0;
}

function startOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function calculateWorkerProductivity(logs: ProductionLogRecord[]) {
  const dayStart = startOfDay();
  const todayLogs = logs.filter((log) => toMillis(log.createdAt) >= dayStart);
  const totalLogsToday = todayLogs.length;

  const logsPerWorker: Record<string, number> = {};
  todayLogs.forEach((log) => {
    const workerKey = String(log.workerName || log.workerId || "unknown");
    logsPerWorker[workerKey] = (logsPerWorker[workerKey] ?? 0) + 1;
  });

  const currentHour = new Date().getHours() + 1;
  const avgLogsPerHour = totalLogsToday / currentHour;

  const sorted = Object.entries(logsPerWorker).sort((a, b) => b[1] - a[1]);
  const topWorker = sorted[0]?.[0] ?? null;
  const lowPerformer = sorted.length > 1 ? sorted[sorted.length - 1][0] : null;

  return {
    totalLogsToday,
    logsPerWorker,
    avgLogsPerHour: Number(avgLogsPerHour.toFixed(2)),
    topWorker,
    lowPerformer,
  };
}

export function calculateOrderProgress(orders: WorkOrderRecord[]) {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const inProgressOrders = orders.filter((o) => o.status === "in_progress").length;

  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const now = Date.now();
  const overdueOrders = orders.filter((o) => toNumber(o.dueDate) > 0 && toNumber(o.dueDate) < now && o.status !== "completed").length;

  return {
    totalOrders,
    completedOrders,
    inProgressOrders,
    completionRate: Number(completionRate.toFixed(2)),
    overdueOrders,
  };
}

export function detectProductionBottlenecks(
  orders: WorkOrderRecord[],
  logs: ProductionLogRecord[],
  warehouses: WarehouseRecord[],
) {
  const bottlenecks: string[] = [];
  let severity: Severity = "low";

  const lowMaterials = warehouses.filter(
    (item) => toNumber(item.quantityRemaining) <= toNumber(item.minStock || 50),
  ).length;
  if (lowMaterials > 0) {
    bottlenecks.push(`Low material items: ${lowMaterials}`);
    severity = "medium";
  }

  const activeWorkers = new Set(
    logs
      .map((log) => String(log.workerId || ""))
      .filter(Boolean),
  ).size;
  if (activeWorkers <= 1 && logs.length > 0) {
    bottlenecks.push("Too few active workers");
    severity = "medium";
  }

  const backlogOrders = orders.filter((o) => o.status !== "completed").length;
  if (backlogOrders >= Math.max(3, Math.ceil(orders.length * 0.6))) {
    bottlenecks.push("Backlog orders increasing");
    severity = "high";
  }

  return { bottlenecks, severity };
}

export function predictDelayRisk(input: {
  completionRate: number;
  backlogOrders: number;
  productivityTrendDown: boolean;
}): { delayRisk: DelayRisk; confidence: number } {
  const { completionRate, backlogOrders, productivityTrendDown } = input;

  if (completionRate < 40 && backlogOrders > 2 && productivityTrendDown) {
    return { delayRisk: "high", confidence: 88 };
  }
  if (completionRate < 65 || backlogOrders > 1) {
    return { delayRisk: "medium", confidence: 72 };
  }
  return { delayRisk: "low", confidence: 60 };
}

export function calculateProductionHealthScore(input: {
  productivityScore: number;
  completionScore: number;
  bottleneckScore: number;
  delayRiskScore: number;
}) {
  const score =
    input.productivityScore * 0.3 +
    input.completionScore * 0.3 +
    input.bottleneckScore * 0.2 +
    input.delayRiskScore * 0.2;

  const normalized = Math.max(0, Math.min(100, Number(score.toFixed(2))));
  const status = normalized >= 75 ? "good" : normalized >= 45 ? "warning" : "critical";
  return { score: normalized, status };
}
