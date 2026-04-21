"use client";

import { db } from "@/services/firebase";
import { type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { COMPANY_STORAGE_KEY, type UserRole } from "@/core/firestore/firestoreClient";

export type TenantBootstrapResult = {
  companyId: string;
  role: UserRole;
  isNewCompany: boolean;
};

function resolveDisplayName(user: User): string {
  if (user.displayName && user.displayName.trim()) {
    return user.displayName;
  }

  if (user.email) {
    const [name] = user.email.split("@");
    if (name) return name;
  }

  return "New User";
}

function resolveCompanyName(user: User): string {
  const name = resolveDisplayName(user);
  return `${name}'s Company`;
}

export async function bootstrapTenant(user: User): Promise<TenantBootstrapResult> {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase environment variables.");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const companyId = (userSnap.data().companyId as string | undefined) ?? "";
    const role = (userSnap.data().role as UserRole | undefined) ?? "staff";

    if (!companyId) {
      throw new Error("User profile exists but companyId is missing.");
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
    }

    return {
      companyId,
      role,
      isNewCompany: false,
    };
  }

  const companyRef = doc(collection(db, "companies"));
  const companyId = companyRef.id;

  await setDoc(companyRef, {
    name: resolveCompanyName(user),
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "companies", companyId, "members", user.uid), {
    role: "owner",
    email: user.email ?? "",
    displayName: resolveDisplayName(user),
  });

  await setDoc(doc(db, "companies", companyId, "modules", "core"), {
    chatEnabled: true,
    productionEnabled: true,
    warehouseEnabled: true,
  });

  await setDoc(userRef, {
    email: user.email ?? "",
    displayName: resolveDisplayName(user),
    companyId,
    role: "owner",
    createdAt: serverTimestamp(),
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  }

  return {
    companyId,
    role: "owner",
    isNewCompany: true,
  };
}
