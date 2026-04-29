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
import { type WarehouseItem } from "@/types/warehouse";

export type WarehouseStatus = "in_stock" | "reserved" | "out_of_stock";

export type CreateWarehouseItemInput = {
  name: string;
  SKU: string;
  quantity: number;
  location: string;
  status: WarehouseStatus;
  assignedTo?: string;
  notes?: string;
};

export type UpdateWarehouseItemInput = Partial<CreateWarehouseItemInput>;

const READ_ROLES: UserRole[] = ["owner", "admin", "manager", "staff"];
const WRITE_ROLES: UserRole[] = ["owner", "admin", "manager"];
const DELETE_ROLES: UserRole[] = ["owner", "admin"];

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

function assertRoleAllowed(role: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(role)) {
    throw new Error("Permission denied");
  }
}

async function validateAccess(companyId: string, allowedRoles: UserRole[]) {
  const currentCompanyId = await getCurrentCompanyId();
  if (!currentCompanyId || currentCompanyId !== companyId) {
    throw new Error("Permission denied");
  }

  const role = await getCurrentUserRole(currentCompanyId);
  if (!role) {
    throw new Error("Permission denied");
  }

  assertRoleAllowed(role, allowedRoles);
  return { role, currentCompanyId };
}

function mapToWarehouseItem(
  companyId: string,
  id: string,
  data: Record<string, unknown>,
): WarehouseItem {
  return {
    id,
    companyId,
    name: (data.name as string) ?? "",
    SKU: (data.SKU as string) ?? "",
    quantity: Number(data.quantity ?? 0),
    location: (data.location as string) ?? "",
    status: (data.status as WarehouseStatus) ?? "in_stock",
    createdBy: (data.createdBy as string) ?? "",
    assignedTo: (data.assignedTo as string | undefined) ?? undefined,
    createdAt: Number(data.createdAt ?? Date.now()),
    updatedAt: Number(data.updatedAt ?? Date.now()),
    notes: (data.notes as string | undefined) ?? undefined,
  };
}

export async function getWarehouseItems(companyId: string): Promise<WarehouseItem[]> {
  assertFirestoreReady();
  await validateAccess(companyId, READ_ROLES);

  const collectionRef = collection(db!, "companies", companyId, "warehouse");
  const itemsQuery = query(collectionRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(itemsQuery);

  return snapshot.docs.map((item) =>
    mapToWarehouseItem(companyId, item.id, item.data() as Record<string, unknown>),
  );
}

export async function getWarehouseItemById(
  companyId: string,
  itemId: string,
): Promise<WarehouseItem | null> {
  assertFirestoreReady();
  await validateAccess(companyId, READ_ROLES);

  const docRef = doc(db!, "companies", companyId, "warehouse", itemId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapToWarehouseItem(
    companyId,
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function createWarehouseItem(
  companyId: string,
  data: CreateWarehouseItemInput,
): Promise<string> {
  assertFirestoreReady();
  await validateAccess(companyId, WRITE_ROLES);

  const uid = auth?.currentUser?.uid;
  if (!uid) {
    throw new Error("Permission denied");
  }

  const now = Date.now();
  const collectionRef = collection(db!, "companies", companyId, "warehouse");
  const created = await addDoc(collectionRef, {
    companyId,
    name: data.name.trim(),
    SKU: data.SKU.trim(),
    quantity: data.quantity,
    location: data.location.trim(),
    status: data.status,
    createdBy: uid,
    assignedTo: data.assignedTo?.trim() || null,
    createdAt: now,
    updatedAt: now,
    notes: data.notes?.trim() || null,
  });

  return created.id;
}

export async function updateWarehouseItem(
  companyId: string,
  itemId: string,
  data: UpdateWarehouseItemInput,
): Promise<void> {
  assertFirestoreReady();
  await validateAccess(companyId, WRITE_ROLES);

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (typeof data.name === "string") payload.name = data.name.trim();
  if (typeof data.SKU === "string") payload.SKU = data.SKU.trim();
  if (typeof data.quantity === "number") payload.quantity = data.quantity;
  if (typeof data.location === "string") payload.location = data.location.trim();
  if (typeof data.status === "string") payload.status = data.status;
  if (Object.prototype.hasOwnProperty.call(data, "assignedTo")) {
    payload.assignedTo = data.assignedTo?.trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "notes")) {
    payload.notes = data.notes?.trim() || null;
  }

  const docRef = doc(db!, "companies", companyId, "warehouse", itemId);
  await updateDoc(docRef, payload);
}

export async function deleteWarehouseItem(companyId: string, itemId: string): Promise<void> {
  assertFirestoreReady();
  await validateAccess(companyId, DELETE_ROLES);

  const docRef = doc(db!, "companies", companyId, "warehouse", itemId);
  await deleteDoc(docRef);
}
