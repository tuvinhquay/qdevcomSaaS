"use client";

import { db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  assertPermission,
  getCurrentCompanyId,
  getCurrentUserRole as getCurrentUserRoleFromClient,
  type UserRole,
} from "@/core/firestore/firestoreClient";

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  return getCurrentUserRoleFromClient();
}

export async function getUserRoleById(userId: string, companyId?: string): Promise<UserRole | null> {
  assertFirestoreReady();
  const resolvedCompanyId = companyId ?? (await getCurrentCompanyId());

  if (!resolvedCompanyId) {
    throw new Error("Company ID is missing for current user.");
  }

  await assertPermission("manage_users", resolvedCompanyId);

  const memberRef = doc(db!, "companies", resolvedCompanyId, "members", userId);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    return null;
  }

  return (memberSnap.data().role as UserRole | undefined) ?? null;
}
