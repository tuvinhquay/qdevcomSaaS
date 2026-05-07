import { db } from "@/services/firebase";
import type { ProductionLog } from "@/models/production_log";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  where,
} from "firebase/firestore";

type AddProductionLogInput = {
  tenantId: string;
  workOrderId: string;
  orderId: string;
  workerId: string;
  workerName: string;
  department: string;
  quantity: number;
  note?: string;
};

function requireDb() {
  if (!db) {
    throw new Error("Firestore chua san sang. Vui long kiem tra bien moi truong Firebase.");
  }

  return db;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function addProductionLog(input: AddProductionLogInput) {
  const firestore = requireDb();

  if (!input.tenantId) throw new Error("Thieu tenantId.");
  if (!input.workOrderId) throw new Error("Thieu workOrderId.");
  if (!input.orderId) throw new Error("Thieu orderId.");
  if (!input.workerId) throw new Error("Thieu workerId.");
  if (input.quantity <= 0) throw new Error("So luong phai lon hon 0.");

  const workOrderRef = doc(firestore, "tenants", input.tenantId, "work_orders", input.workOrderId);

  // STEP 2: Cap nhat completedQuantity trong work order bang transaction de tranh race condition.
  const workOrderResult = await runTransaction(firestore, async (transaction) => {
    const workOrderSnap = await transaction.get(workOrderRef);

    if (!workOrderSnap.exists()) {
      throw new Error("Khong tim thay Work Order.");
    }

    const workOrder = workOrderSnap.data() as Record<string, unknown>;
    const currentCompleted = toNumber(workOrder.completedQuantity);
    const targetQuantity = Math.max(
      0,
      toNumber(workOrder.targetQuantity) || toNumber(workOrder.quantity),
    );

    const nextCompletedRaw = currentCompleted + input.quantity;
    const nextCompleted = targetQuantity > 0 ? Math.min(nextCompletedRaw, targetQuantity) : nextCompletedRaw;
    const acceptedQuantity = nextCompleted - currentCompleted;

    if (acceptedQuantity <= 0) {
      throw new Error("Work Order da dat muc tieu, khong the nhap them.");
    }

    const nextStatus =
      targetQuantity > 0 && nextCompleted >= targetQuantity
        ? "completed"
        : nextCompleted > 0
          ? "in_progress"
          : String(workOrder.status || "pending");

    transaction.update(workOrderRef, {
      completedQuantity: nextCompleted,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    return { acceptedQuantity, nextCompleted, targetQuantity, nextStatus };
  });

  const acceptedQuantity = workOrderResult.acceptedQuantity;

  // STEP 1: Luu production log (so luong da duoc chap nhan sau khi cap target).
  const logPayload: Omit<ProductionLog, "id"> & { createdAt: unknown } = {
    tenantId: input.tenantId,
    workOrderId: input.workOrderId,
    orderId: input.orderId,
    workerId: input.workerId,
    workerName: input.workerName,
    department: input.department,
    quantity: acceptedQuantity,
    note: input.note?.trim() || "",
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(firestore, "tenants", input.tenantId, "production_logs"), logPayload);

  // STEP 3: Tru vat lieu kho theo orderId.
  const warehouseQuery = query(
    collection(firestore, "tenants", input.tenantId, "warehouse_items"),
    where("orderId", "==", input.orderId),
  );
  const warehouseSnap = await getDocs(warehouseQuery);

  if (!warehouseSnap.empty) {
    const batch = writeBatch(firestore);

    warehouseSnap.docs.forEach((itemDoc) => {
      const itemData = itemDoc.data() as Record<string, unknown>;
      const total = toNumber(itemData.quantityTotal);
      const used = toNumber(itemData.quantityUsed);

      const nextUsed = used + acceptedQuantity;
      const nextRemaining = Math.max(0, total - nextUsed);

      batch.update(itemDoc.ref, {
        quantityUsed: nextUsed,
        quantityRemaining: nextRemaining,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  return {
    acceptedQuantity,
    workOrder: workOrderResult,
  };
}

export async function getWorkOrderById(tenantId: string, workOrderId: string) {
  const firestore = requireDb();
  const ref = doc(firestore, "tenants", tenantId, "work_orders", workOrderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
