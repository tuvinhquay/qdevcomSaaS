"use client";

import { auth, db } from "@/services/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  getCurrentCompanyId,
  getCurrentUserRole,
  type UserRole,
} from "@/core/firestore/firestoreClient";
import { type ProductionOrder, type ProductionStatus } from "@/types/production";

export type CreateProductionOrderInput = {
  workOrderId?: string;
  title: string;
  description?: string;
  quantity: number;
  producedQuantity?: number;
  status: ProductionStatus;
  assignedTo?: string;
  dueDate?: number;
  startDate?: number;
};

export type UpdateProductionOrderInput = Partial<CreateProductionOrderInput>;

const READ_ROLES: UserRole[] = ["owner", "admin", "manager", "staff"];
const WRITE_ROLES: UserRole[] = ["owner", "admin", "manager"];
const DELETE_ROLES: UserRole[] = ["owner", "admin"];

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

function assertRoleAllowed(role: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }
}

async function getContextOrThrow() {
  const companyId = await getCurrentCompanyId();
  const role = await getCurrentUserRole(companyId ?? undefined);
  const uid = auth?.currentUser?.uid;

  if (!companyId || !role || !uid) {
    throw new Error("Permission denied");
  }

  return { companyId, role, uid };
}

function mapDocToProductionOrder(
  companyId: string,
  documentId: string,
  data: Record<string, unknown>,
): ProductionOrder {
  return {
    id: documentId,
    companyId,
    workOrderId: (data.workOrderId as string | undefined) ?? undefined,
    title: (data.title as string) ?? "",
    description: (data.description as string | undefined) ?? undefined,
    quantity: Number(data.quantity ?? 0),
    producedQuantity: Number(data.producedQuantity ?? 0),
    status: (data.status as ProductionStatus) ?? "planned",
    assignedTo: (data.assignedTo as string | undefined) ?? undefined,
    createdBy: (data.createdBy as string) ?? "",
    startDate: (data.startDate as number | undefined) ?? undefined,
    dueDate: (data.dueDate as number | undefined) ?? undefined,
    createdAt: Number(data.createdAt ?? Date.now()),
    updatedAt: Number(data.updatedAt ?? Date.now()),
  };
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  assertFirestoreReady();
  const { companyId, role } = await getContextOrThrow();
  assertRoleAllowed(role, READ_ROLES);

  const collectionRef = collection(db!, "companies", companyId, "productionOrders");
  const productionQuery = query(collectionRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(productionQuery);

  return snapshot.docs.map((item) =>
    mapDocToProductionOrder(companyId, item.id, item.data() as Record<string, unknown>),
  );
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | null> {
  assertFirestoreReady();
  const { companyId, role } = await getContextOrThrow();
  assertRoleAllowed(role, READ_ROLES);

  const docRef = doc(db!, "companies", companyId, "productionOrders", id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapDocToProductionOrder(
    companyId,
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function createProductionOrder(data: CreateProductionOrderInput): Promise<string> {
  assertFirestoreReady();
  const { companyId, role, uid } = await getContextOrThrow();
  assertRoleAllowed(role, WRITE_ROLES);

  const now = Date.now();
  const collectionRef = collection(db!, "companies", companyId, "productionOrders");
  const created = await addDoc(collectionRef, {
    companyId,
    workOrderId: data.workOrderId?.trim() || null,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    quantity: data.quantity,
    producedQuantity: data.producedQuantity ?? 0,
    status: data.status,
    assignedTo: data.assignedTo?.trim() || null,
    createdBy: uid,
    startDate: data.startDate ?? null,
    dueDate: data.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return created.id;
}

export async function updateProductionOrder(
  id: string,
  data: UpdateProductionOrderInput,
): Promise<void> {
  assertFirestoreReady();
  const { companyId, role } = await getContextOrThrow();
  assertRoleAllowed(role, WRITE_ROLES);

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (typeof data.title === "string") payload.title = data.title.trim();
  if (typeof data.description === "string") payload.description = data.description.trim();
  if (typeof data.quantity === "number") payload.quantity = data.quantity;
  if (typeof data.producedQuantity === "number") payload.producedQuantity = data.producedQuantity;
  if (typeof data.status === "string") payload.status = data.status;
  if (typeof data.startDate === "number") payload.startDate = data.startDate;
  if (typeof data.dueDate === "number") payload.dueDate = data.dueDate;
  if (Object.prototype.hasOwnProperty.call(data, "assignedTo")) {
    payload.assignedTo = data.assignedTo?.trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "workOrderId")) {
    payload.workOrderId = data.workOrderId?.trim() || null;
  }

  const docRef = doc(db!, "companies", companyId, "productionOrders", id);
  await updateDoc(docRef, payload);
}

export async function deleteProductionOrder(id: string): Promise<void> {
  assertFirestoreReady();
  const { companyId, role } = await getContextOrThrow();
  assertRoleAllowed(role, DELETE_ROLES);

  const docRef = doc(db!, "companies", companyId, "productionOrders", id);
  await deleteDoc(docRef);
}
