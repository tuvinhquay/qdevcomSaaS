import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase";

function assertDb() {
  if (!db) throw new Error("Firestore is not initialized.");
}

export async function createGroup(params: {
  tenantId: string;
  groupName: string;
  groupAvatar?: string;
  createdBy: string;
  memberIds: string[];
}): Promise<string> {
  assertDb();
  const uniqueMemberIds = Array.from(new Set([params.createdBy, ...params.memberIds]));

  const groupRef = await addDoc(collection(db!, "tenants", params.tenantId, "groups"), {
    groupName: params.groupName.trim(),
    groupAvatar: params.groupAvatar ?? null,
    createdBy: params.createdBy,
    memberIds: uniqueMemberIds,
    admins: [params.createdBy],
    createdAt: serverTimestamp(),
  });

  return groupRef.id;
}

export async function updateGroup(params: {
  tenantId: string;
  groupId: string;
  groupName?: string;
  groupAvatar?: string;
}): Promise<void> {
  assertDb();
  const payload: Record<string, unknown> = {};
  if (typeof params.groupName === "string") payload.groupName = params.groupName.trim();
  if (typeof params.groupAvatar === "string") payload.groupAvatar = params.groupAvatar.trim();
  await updateDoc(doc(db!, "tenants", params.tenantId, "groups", params.groupId), payload);
}

export async function deleteGroup(tenantId: string, groupId: string): Promise<void> {
  assertDb();
  await deleteDoc(doc(db!, "tenants", tenantId, "groups", groupId));
}

export async function addGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "groups", groupId), {
    memberIds: arrayUnion(userId),
  });
}

export async function removeGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "groups", groupId), {
    memberIds: arrayRemove(userId),
    admins: arrayRemove(userId),
  });
}

export async function promoteGroupAdmin(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "groups", groupId), {
    admins: arrayUnion(userId),
  });
}

export async function demoteGroupAdmin(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "groups", groupId), {
    admins: arrayRemove(userId),
  });
}

export async function getGroupsForUser(tenantId: string, userId: string) {
  assertDb();
  const snap = await getDocs(collection(db!, "tenants", tenantId, "groups"));
  const raw = snap.docs.map(
    (item) => ({ id: item.id, ...(item.data() as Record<string, unknown>) }) as Record<string, unknown>,
  );
  return raw
    .filter((item) => Array.isArray(item.memberIds) && item.memberIds.includes(userId));
}

export async function canManageGroup(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<boolean> {
  assertDb();
  const groupSnap = await getDoc(doc(db!, "tenants", tenantId, "groups", groupId));
  if (!groupSnap.exists()) return false;
  const data = groupSnap.data() as { admins?: string[]; createdBy?: string };
  return data.createdBy === userId || (data.admins ?? []).includes(userId);
}
