import { db } from "@/services/firebase";
import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import {
  calculateOrderProgress,
  calculateProductionHealthScore,
  calculateWorkerProductivity,
  detectProductionBottlenecks,
  predictDelayRisk,
} from "@/intelligence/productionAnalytics";

function ensureDb() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
  return db;
}

function severityToBottleneckScore(severity: "low" | "medium" | "high") {
  if (severity === "low") return 100;
  if (severity === "medium") return 60;
  return 30;
}

function delayRiskToScore(risk: "low" | "medium" | "high") {
  if (risk === "low") return 90;
  if (risk === "medium") return 60;
  return 30;
}

export async function runProductionIntelligence(tenantId: string) {
  const firestore = ensureDb();

  const [productionLogsSnap, workOrdersSnap, warehouseSnap, workersSnap] = await Promise.all([
    getDocs(collection(firestore, "tenants", tenantId, "production_logs")),
    getDocs(collection(firestore, "tenants", tenantId, "work_orders")),
    getDocs(collection(firestore, "tenants", tenantId, "warehouse_items")),
    getDocs(collection(firestore, "tenants", tenantId, "workers")),
  ]);

  const productionLogs = productionLogsSnap.docs.map((d) => d.data());
  const workOrders = workOrdersSnap.docs.map((d) => d.data());
  const warehouseItems = warehouseSnap.docs.map((d) => d.data());
  const workers = workersSnap.docs.map((d) => d.data());

  const workerStats = calculateWorkerProductivity(productionLogs);
  const orderStats = calculateOrderProgress(workOrders);
  const bottlenecks = detectProductionBottlenecks(workOrders, productionLogs, warehouseItems);
  const delayPrediction = predictDelayRisk({
    completionRate: orderStats.completionRate,
    backlogOrders: orderStats.totalOrders - orderStats.completedOrders,
    productivityTrendDown: workerStats.avgLogsPerHour < 1,
  });

  const productivityScore = Math.min(100, workerStats.avgLogsPerHour * 20);
  const completionScore = orderStats.completionRate;
  const bottleneckScore = severityToBottleneckScore(bottlenecks.severity);
  const delayRiskScore = delayRiskToScore(delayPrediction.delayRisk);
  const healthScore = calculateProductionHealthScore({
    productivityScore,
    completionScore,
    bottleneckScore,
    delayRiskScore,
  });

  await setDoc(
    doc(firestore, "intelligence", "production", "global"),
    {
      tenantId,
      updatedAt: serverTimestamp(),
      workerStats,
      orderStats,
      workersCount: workers.length,
      bottlenecks,
      delayPrediction,
      healthScore,
    },
    { merge: true },
  );

  return {
    workerStats,
    orderStats,
    bottlenecks,
    delayPrediction,
    healthScore,
  };
}
