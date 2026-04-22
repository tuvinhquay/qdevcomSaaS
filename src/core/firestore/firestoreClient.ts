"use client";

import { auth, db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";

export const COMPANY_STORAGE_KEY = "qdevcom.companyId.v1";

export type UserRole = "owner" | "admin" | "manager" | "staff" | "guest";

export type Permission =
  | "full_access"
  | "manage_users"
  | "manage_modules"
  | "manage_workorders"
  | "manage_production"
  | "read_only_modules"
  | "access_dashboard"
  | "access_chat"
  | "access_workorders"
  | "access_production"
  | "access_warehouse"
  | "access_settings";

const ALL_PERMISSIONS: Permission[] = [
  "full_access",
  "manage_users",
  "manage_modules",
  "manage_workorders",
  "manage_production",
  "read_only_modules",
  "access_dashboard",
  "access_chat",
  "access_workorders",
  "access_production",
  "access_warehouse",
  "access_settings",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: [
    "manage_users",
    "manage_modules",
    "access_dashboard",
    "access_chat",
    "access_workorders",
    "access_production",
    "access_warehouse",
    "access_settings",
  ],
  manager: [
    "access_dashboard",
    "access_chat",
    "manage_workorders",
    "manage_production",
    "access_workorders",
    "access_production",
  ],
  staff: [
    "access_dashboard",
    "access_chat",
    "access_warehouse",
    "read_only_modules",
  ],
  guest: ["access_dashboard", "access_chat", "read_only_modules"],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  if (role === "owner") {
    return true;
  }

  const allowedPermissions = ROLE_PERMISSIONS[role] ?? [];
  return allowedPermissions.includes(permission);
}

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

export async function getCurrentUserRole(companyId?: string): Promise<UserRole | null> {
  const uid = getAuthenticatedUid();
  if (!uid || !db) {
    return null;
  }

  const resolvedCompanyId = companyId ?? (await getCurrentCompanyId());
  if (!resolvedCompanyId) {
    return null;
  }

  const memberRef = doc(db, "companies", resolvedCompanyId, "members", uid);
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists()) {
    return (memberSnap.data().role as UserRole | undefined) ?? null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    return null;
  }

  const userCompanyId = userSnap.data().companyId as string | undefined;
  if (userCompanyId !== resolvedCompanyId) {
    return null;
  }

  return (userSnap.data().role as UserRole | undefined) ?? null;
}

export async function hasCurrentUserPermission(
  permission: Permission,
  companyId?: string,
): Promise<boolean> {
  const role = await getCurrentUserRole(companyId);
  if (!role) {
    return false;
  }

  return roleHasPermission(role, permission);
}

export async function assertPermission(
  permission: Permission,
  companyId?: string,
): Promise<void> {
  const allowed = await hasCurrentUserPermission(permission, companyId);
  if (!allowed) {
    throw new Error("Permission denied");
  }
}
