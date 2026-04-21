"use client";

import { auth } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export const COMPANY_STORAGE_KEY = "qdevcom.companyId.v1";

export type UserRole = "owner" | "admin" | "manager" | "staff";

export function getAuthenticatedUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

export async function getCurrentCompanyId(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const localCompanyId = window.localStorage.getItem(COMPANY_STORAGE_KEY);
    if (localCompanyId) {
      return localCompanyId;
    }
  }

  const uid = getAuthenticatedUid();
  if (!uid || !db) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const companyId = (userSnap.data().companyId as string | undefined) ?? null;

  if (companyId && typeof window !== "undefined") {
    window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  }

  return companyId;
}
