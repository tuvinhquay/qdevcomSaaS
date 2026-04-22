"use client";

import { auth, db } from "@/services/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {
  roleHasPermission,
  type Permission,
  type UserRole,
} from "@/core/firestore/firestoreClient";

const VALID_ROLES: UserRole[] = ["owner", "admin", "manager", "staff", "guest"];

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

function assertValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export async function getUserRole(companyId: string, userId: string): Promise<UserRole | null> {
  assertFirestoreReady();

  const memberRef = doc(db!, "companies", companyId, "members", userId);
  const memberSnap = await getDoc(memberRef);

  if (memberSnap.exists()) {
    const role = memberSnap.data().role as string | undefined;
    return role && assertValidRole(role) ? role : null;
  }

  const userRef = doc(db!, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const userData = userSnap.data();
  const userCompanyId = userData.companyId as string | undefined;
  const userRole = userData.role as string | undefined;

  if (userCompanyId !== companyId || !userRole || !assertValidRole(userRole)) {
    return null;
  }

  return userRole;
}

export async function hasPermission(
  companyId: string,
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const role = await getUserRole(companyId, userId);
  if (!role) {
    return false;
  }

  return roleHasPermission(role, permission);
}

export async function setUserRole(
  companyId: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  assertFirestoreReady();

  const actingUid = auth?.currentUser?.uid;
  if (!actingUid) {
    throw new Error("Permission denied");
  }

  const canManageUsers = await hasPermission(companyId, actingUid, "manage_users");
  if (!canManageUsers) {
    throw new Error("Permission denied");
  }

  const memberRef = doc(db!, "companies", companyId, "members", userId);
  await setDoc(memberRef, { role }, { merge: true });

  const userRef = doc(db!, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, { role });
  }
}
