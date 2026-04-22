"use client";

import { db } from "@/services/firebase";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  assertPermission,
  getCurrentCompanyId,
  type UserRole,
} from "@/core/firestore/firestoreClient";
import { setUserRole } from "@/core/firestore/roles";

export type CompanyMember = {
  userId: string;
  role: UserRole;
  email: string;
  displayName: string;
};

type AddMemberInput = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
};

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

async function resolveCompanyIdOrThrow(companyId?: string): Promise<string> {
  const resolvedCompanyId = companyId ?? (await getCurrentCompanyId());
  if (!resolvedCompanyId) {
    throw new Error("Company ID is missing for current user.");
  }
  return resolvedCompanyId;
}

export async function getCompanyMembers(companyId?: string): Promise<CompanyMember[]> {
  assertFirestoreReady();
  const resolvedCompanyId = await resolveCompanyIdOrThrow(companyId);
  await assertPermission("manage_users", resolvedCompanyId);

  const membersRef = collection(db!, "companies", resolvedCompanyId, "members");
  const membersSnap = await getDocs(membersRef);

  return membersSnap.docs.map((memberDoc) => {
    const data = memberDoc.data();

    return {
      userId: memberDoc.id,
      role: (data.role as UserRole) ?? "staff",
      email: (data.email as string) ?? "",
      displayName: (data.displayName as string) ?? "",
    };
  });
}

export async function addMember(input: AddMemberInput, companyId?: string): Promise<void> {
  assertFirestoreReady();
  const resolvedCompanyId = await resolveCompanyIdOrThrow(companyId);
  await assertPermission("manage_users", resolvedCompanyId);

  const memberRef = doc(db!, "companies", resolvedCompanyId, "members", input.userId);
  const userRef = doc(db!, "users", input.userId);

  await setDoc(
    memberRef,
    {
      role: input.role,
      email: input.email,
      displayName: input.displayName,
    },
    { merge: true },
  );

  await setDoc(
    userRef,
    {
      companyId: resolvedCompanyId,
      role: input.role,
      email: input.email,
      displayName: input.displayName,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserRole(userId: string, role: UserRole, companyId?: string): Promise<void> {
  const resolvedCompanyId = await resolveCompanyIdOrThrow(companyId);
  await setUserRole(resolvedCompanyId, userId, role);
}
