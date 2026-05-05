import { db } from "@/services/firebase";
import { collection, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";

function requireDb() {
  if (!db) {
    throw new Error("Firestore chua san sang. Kiem tra bien moi truong Firebase.");
  }

  return db;
}

type SeedSummary = {
  workers: number;
  orders: number;
  workOrders: number;
  warehouseItems: number;
};

export async function seedTenantSampleData(tenantId: string, userId: string): Promise<SeedSummary> {
  const firestore = requireDb();
  const now = Date.now();

  const summary: SeedSummary = {
    workers: 0,
    orders: 0,
    workOrders: 0,
    warehouseItems: 0,
  };

  const workersRef = collection(firestore, "tenants", tenantId, "workers");
  const ordersRef = collection(firestore, "tenants", tenantId, "orders");
  const workOrdersRef = collection(firestore, "tenants", tenantId, "work_orders");
  const warehouseItemsRef = collection(firestore, "tenants", tenantId, "warehouse_items");

  // Chi seed khi collection dang rong de tranh trung du lieu.
  const [workersSnap, ordersSnap, workOrdersSnap, warehouseSnap] = await Promise.all([
    getDocs(workersRef),
    getDocs(ordersRef),
    getDocs(workOrdersRef),
    getDocs(warehouseItemsRef),
  ]);

  const batch = writeBatch(firestore);

  if (workersSnap.empty) {
    const workers = [
      { name: "Nguyen Van A", team: "To may" },
      { name: "Tran Thi B", team: "QC" },
      { name: "Le Van C", team: "Cat" },
      { name: "Pham Thi D", team: "Dong goi" },
      { name: "Hoang Van E", team: "Kho" },
    ];

    workers.forEach((worker, index) => {
      const workerDoc = doc(workersRef, `worker_${index + 1}`);
      batch.set(workerDoc, {
        ...worker,
        stats: {
          totalOutput: 0,
          totalDefect: 0,
          attendanceDays: 0,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      summary.workers += 1;
    });
  }

  if (ordersSnap.empty) {
    const orders = [
      { orderCode: "NIKE_001", productName: "Ao NIKE", quantity: 1000 },
      { orderCode: "ADIDAS_002", productName: "Quan ADIDAS", quantity: 800 },
    ];

    orders.forEach((order, index) => {
      const orderDoc = doc(ordersRef, `order_${index + 1}`);
      batch.set(orderDoc, {
        ...order,
        status: "pending",
        producedQuantity: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      summary.orders += 1;
    });
  }

  if (workOrdersSnap.empty) {
    const steps = ["Cat vai", "May than", "QC", "Dong goi"];

    steps.forEach((step, index) => {
      const workOrderDoc = doc(workOrdersRef, `work_order_${index + 1}`);
      batch.set(workOrderDoc, {
        title: step,
        status: "pending",
        progress: 0,
        priority: "normal",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      summary.workOrders += 1;
    });
  }

  if (warehouseSnap.empty) {
    const items = [
      { itemName: "Vai cotton", quantityTotal: 1200, quantityUsed: 0 },
      { itemName: "Chi may", quantityTotal: 300, quantityUsed: 0 },
      { itemName: "Nut ao", quantityTotal: 5000, quantityUsed: 0 },
    ];

    items.forEach((item, index) => {
      const quantityRemaining = item.quantityTotal - item.quantityUsed;
      const itemDoc = doc(warehouseItemsRef, `material_${index + 1}`);

      batch.set(itemDoc, {
        ...item,
        quantityRemaining,
        unit: "pcs",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      summary.warehouseItems += 1;
    });
  }

  if (
    summary.workers > 0 ||
    summary.orders > 0 ||
    summary.workOrders > 0 ||
    summary.warehouseItems > 0
  ) {
    await batch.commit();
  }

  await setDoc(
    doc(firestore, "tenants", tenantId, "settings", "seed_meta"),
    {
      lastSeedBy: userId,
      lastSeedAt: now,
      summary,
    },
    { merge: true },
  );

  return summary;
}
