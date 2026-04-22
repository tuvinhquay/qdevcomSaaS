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
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getCurrentUserRole, type UserRole } from "@/core/firestore/firestoreClient";

export type WorkOrderStatus = "pending" | "in_progress" | "completed";

export type WorkOrder = {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CreateWorkOrderInput = {
  title: string;
  description: string;
  status: WorkOrderStatus;
  assignedTo?: string | null;
};

export type UpdateWorkOrderInput = Partial<CreateWorkOrderInput>;

const READ_ROLES: UserRole[] = ["owner", "admin", "manager", "staff"];
const WRITE_ROLES: UserRole[] = ["owner", "admin", "manager"];
const DELETE_ROLES: UserRole[] = ["owner", "admin"];

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

async function getCurrentRoleOrThrow(companyId: string): Promise<UserRole> {
  const role = await getCurrentUserRole(companyId);
  if (!role) {
    throw new Error("Permission denied");
  }
  return role;
}

function assertRoleAllowed(role: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }
}

export async function getWorkOrders(companyId: string): Promise<WorkOrder[]> {
  assertFirestoreReady();
  const role = await getCurrentRoleOrThrow(companyId);
  assertRoleAllowed(role, READ_ROLES);

  const workOrdersRef = collection(db!, "companies", companyId, "workOrders");
  const workOrdersQuery = query(workOrdersRef, orderBy("updatedAt", "desc"));
  const workOrdersSnap = await getDocs(workOrdersQuery);

  return workOrdersSnap.docs.map((workOrderDoc) => {
    const data = workOrderDoc.data();

    return {
      id: workOrderDoc.id,
      title: (data.title as string) ?? "",
      description: (data.description as string) ?? "",
      status: (data.status as WorkOrderStatus) ?? "pending",
      assignedTo: (data.assignedTo as string | null | undefined) ?? null,
      createdBy: (data.createdBy as string) ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

export async function getWorkOrderById(
  companyId: string,
  workOrderId: string,
): Promise<WorkOrder | null> {
  assertFirestoreReady();
  const role = await getCurrentRoleOrThrow(companyId);
  assertRoleAllowed(role, READ_ROLES);

  const workOrderRef = doc(db!, "companies", companyId, "workOrders", workOrderId);
  const workOrderSnap = await getDoc(workOrderRef);

  if (!workOrderSnap.exists()) {
    return null;
  }

  const data = workOrderSnap.data();

  return {
    id: workOrderSnap.id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    status: (data.status as WorkOrderStatus) ?? "pending",
    assignedTo: (data.assignedTo as string | null | undefined) ?? null,
    createdBy: (data.createdBy as string) ?? "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createWorkOrder(
  companyId: string,
  data: CreateWorkOrderInput,
): Promise<string> {
  assertFirestoreReady();
  const role = await getCurrentRoleOrThrow(companyId);
  assertRoleAllowed(role, WRITE_ROLES);

  const currentUid = auth?.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Permission denied");
  }

  const workOrdersRef = collection(db!, "companies", companyId, "workOrders");
  const createdDoc = await addDoc(workOrdersRef, {
    title: data.title,
    description: data.description,
    status: data.status,
    assignedTo: data.assignedTo ?? null,
    createdBy: currentUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return createdDoc.id;
}

export async function updateWorkOrder(
  companyId: string,
  workOrderId: string,
  data: UpdateWorkOrderInput,
): Promise<void> {
  assertFirestoreReady();
  const role = await getCurrentRoleOrThrow(companyId);
  assertRoleAllowed(role, WRITE_ROLES);

  const workOrderRef = doc(db!, "companies", companyId, "workOrders", workOrderId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof data.title === "string") payload.title = data.title;
  if (typeof data.description === "string") payload.description = data.description;
  if (typeof data.status === "string") payload.status = data.status;
  if (Object.prototype.hasOwnProperty.call(data, "assignedTo")) {
    payload.assignedTo = data.assignedTo ?? null;
  }

  await updateDoc(workOrderRef, payload);
}

export async function deleteWorkOrder(companyId: string, workOrderId: string): Promise<void> {
  assertFirestoreReady();
  const role = await getCurrentRoleOrThrow(companyId);
  assertRoleAllowed(role, DELETE_ROLES);

  const workOrderRef = doc(db!, "companies", companyId, "workOrders", workOrderId);
  await deleteDoc(workOrderRef);
}
