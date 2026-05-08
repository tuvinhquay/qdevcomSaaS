import "dotenv/config";
import { db } from "@/services/firebase";
import { addProductionLog } from "@/services/production_service";
import { pushSecurityEvent } from "@/security/securityEventService";
import { updateThreatScore } from "@/security/threatScoreService";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const TENANT_ID = "demoTenant";
const TEST_USER_ID = "systemTest";

function ensureDb() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
  return db;
}

async function testFirebaseConnection() {
  try {
    const firestore = ensureDb();
    await getDoc(doc(firestore, "tenants", TENANT_ID, "settings", "config"));
    console.log("✅ Firebase connected");
  } catch (error) {
    console.error("❌ Firebase connection failed", error);
  }
}

async function checkCollections() {
  const firestore = ensureDb();
  const checks = [
    { key: "settings/config", ref: doc(firestore, "tenants", TENANT_ID, "settings", "config"), type: "doc" as const },
    { key: "work_orders", ref: collection(firestore, "tenants", TENANT_ID, "work_orders"), type: "col" as const },
    { key: "production_logs", ref: collection(firestore, "tenants", TENANT_ID, "production_logs"), type: "col" as const },
    { key: "warehouse_items", ref: collection(firestore, "tenants", TENANT_ID, "warehouse_items"), type: "col" as const },
    { key: "workers", ref: collection(firestore, "tenants", TENANT_ID, "workers"), type: "col" as const },
    { key: "securityEvents", ref: collection(firestore, "securityEvents"), type: "col" as const },
  ];

  for (const item of checks) {
    try {
      if (item.type === "doc") {
        const snap = await getDoc(item.ref);
        console.log(snap.exists() ? `✔ ${item.key} OK` : `⚠ ${item.key} missing`);
      } else {
        const snap = await getDocs(query(item.ref, limit(1)));
        console.log(`✔ ${item.key} OK`);
        if (snap.empty) {
          console.warn(`⚠ ${item.key} is empty`);
        }
      }
    } catch (error) {
      console.error(`❌ ${item.key} check failed`, error);
    }
  }
}

async function seedSampleCompanyData(tenantId: string, userId: string) {
  const firestore = ensureDb();
  const now = Date.now();

  await setDoc(
    doc(firestore, "tenants", tenantId, "settings", "config"),
    {
      languages: { default: "vi", supported: ["vi", "en"] },
      warehouse: { minStock: 50 },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  const workers = [
    { id: "worker_1", name: "Nguyen Van A", monthlyQuantity: 120, monthlyIncome: 1200000 },
    { id: "worker_2", name: "Tran Thi B", monthlyQuantity: 98, monthlyIncome: 980000 },
  ];
  for (const worker of workers) {
    await setDoc(doc(firestore, "tenants", tenantId, "workers", worker.id), {
      ...worker,
      createdBy: userId,
      updatedAt: now,
    });
  }

  await setDoc(doc(firestore, "tenants", tenantId, "work_orders", "wo_test_1"), {
    orderId: "ORDER_TEST_1",
    stage: "May than",
    machine: "May may 1 kim",
    targetQuantity: 100,
    completedQuantity: 10,
    status: "in_progress",
    createdBy: userId,
    updatedAt: now,
  });

  await setDoc(doc(firestore, "tenants", tenantId, "warehouse_items", "wh_test_1"), {
    orderId: "ORDER_TEST_1",
    itemName: "Vai cotton",
    quantityTotal: 500,
    quantityUsed: 20,
    quantityRemaining: 480,
    updatedAt: now,
  });
}

async function testSeedData() {
  await seedSampleCompanyData(TENANT_ID, TEST_USER_ID);
  const firestore = ensureDb();

  const [workersSnap, warehouseSnap, workOrdersSnap] = await Promise.all([
    getDocs(collection(firestore, "tenants", TENANT_ID, "workers")),
    getDocs(collection(firestore, "tenants", TENANT_ID, "warehouse_items")),
    getDocs(collection(firestore, "tenants", TENANT_ID, "work_orders")),
  ]);

  console.log(`Workers: ${workersSnap.size}`);
  console.log(`Warehouse items: ${warehouseSnap.size}`);
  console.log(`Work orders: ${workOrdersSnap.size}`);
}

async function testDashboardMetrics() {
  const firestore = ensureDb();
  const [ordersSnap, productionLogsSnap, warehouseSnap, workersSnap] = await Promise.all([
    getDocs(collection(firestore, "tenants", TENANT_ID, "work_orders")),
    getDocs(collection(firestore, "tenants", TENANT_ID, "production_logs")),
    getDocs(collection(firestore, "tenants", TENANT_ID, "warehouse_items")),
    getDocs(collection(firestore, "tenants", TENANT_ID, "workers")),
  ]);

  const totalOrders = ordersSnap.size;
  const completedOrders = ordersSnap.docs.filter((d) => d.data().status === "completed").length;
  const lowStockItems = warehouseSnap.docs.filter((d) => Number(d.data().quantityRemaining ?? 0) < 50).length;
  const topWorkers = workersSnap.docs
    .map((d) => d.data())
    .sort((a, b) => Number(b.monthlyQuantity ?? 0) - Number(a.monthlyQuantity ?? 0))
    .slice(0, 5);
  const productionToday = productionLogsSnap.docs.reduce((sum, d) => sum + Number(d.data().quantity ?? 0), 0);

  console.log(`Total Orders: ${totalOrders}`);
  console.log(`Completed Orders: ${completedOrders}`);
  console.log(`Low Stock Items: ${lowStockItems}`);
  console.log(`Top Workers: ${topWorkers.length}`);
  console.log(`Production Today: ${productionToday}`);
}

async function testProductionFlow() {
  const firestore = ensureDb();
  const workOrdersSnap = await getDocs(
    query(
      collection(firestore, "tenants", TENANT_ID, "work_orders"),
      limit(10),
    ),
  );
  const candidate = workOrdersSnap.docs.find((d) => d.data().status !== "completed");
  if (!candidate) {
    console.warn("⚠ No work_order available for production flow test.");
    return;
  }

  const before = Number(candidate.data().completedQuantity ?? 0);
  const orderId = String(candidate.data().orderId ?? "");
  if (!orderId) {
    console.warn("⚠ Work order has no orderId, skip production chain test.");
    return;
  }

  await addProductionLog({
    tenantId: TENANT_ID,
    workOrderId: candidate.id,
    orderId,
    workerId: "testWorker",
    workerName: "Test Worker",
    department: "Production",
    quantity: 5,
    note: "System check log",
  });

  const updatedWorkOrder = await getDoc(doc(firestore, "tenants", TENANT_ID, "work_orders", candidate.id));
  const after = Number(updatedWorkOrder.data()?.completedQuantity ?? 0);

  const warehouseSnap = await getDocs(
    query(collection(firestore, "tenants", TENANT_ID, "warehouse_items"), limit(1)),
  );
  const productionLogsSnap = await getDocs(
    query(
      collection(firestore, "tenants", TENANT_ID, "production_logs"),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
  );

  console.log(`WorkOrder completedQuantity before: ${before}, after: ${after}`);
  console.log(`Warehouse checked docs: ${warehouseSnap.size}`);
  console.log(`Production log created: ${productionLogsSnap.size > 0 ? "YES" : "NO"}`);
}

async function testSecurityPipeline() {
  const firestore = ensureDb();
  await pushSecurityEvent({
    type: "ALERT",
    severity: "low",
    message: "Security pipeline test",
    userId: TEST_USER_ID,
    metadata: { source: "system_check" },
  });
  await updateThreatScore(42);

  const eventsSnap = await getDocs(query(collection(firestore, "securityEvents"), limit(1)));
  const metaSnap = await getDoc(doc(firestore, "securityMeta", "global"));

  console.log(eventsSnap.empty ? "Security event write FAILED" : "Security event write OK");
  console.log(metaSnap.exists() ? "Threat score doc exists OK" : "Threat score doc missing");
}

export async function runFullSystemCheck() {
  console.log("🚀 START SYSTEM CHECK");

  const tasks: Array<[string, () => Promise<void>]> = [
    ["Firebase Connection", testFirebaseConnection],
    ["Firestore Structure", checkCollections],
    ["Seed Data", testSeedData],
    ["Dashboard Metrics", testDashboardMetrics],
    ["Production Flow", testProductionFlow],
    ["Security Pipeline", testSecurityPipeline],
  ];

  for (const [name, task] of tasks) {
    try {
      await task();
    } catch (error) {
      console.error(`❌ ${name} test failed`, error);
    }
  }

  console.log("🎉 SYSTEM CHECK COMPLETED");
}

runFullSystemCheck().catch((error) => {
  console.error("❌ SYSTEM CHECK FAILED", error);
  process.exitCode = 1;
});
