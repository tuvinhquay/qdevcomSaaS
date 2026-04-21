"use client";

import { auth, db } from "@/services/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getCurrentCompanyId, type UserRole } from "@/core/firestore/firestoreClient";

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

  const existingUserSnap = await getDoc(userRef);
  if (existingUserSnap.exists()) {
    await updateDoc(userRef, {
      companyId: resolvedCompanyId,
      role: input.role,
      email: input.email,
      displayName: input.displayName,
    });
    return;
  }

  await setDoc(userRef, {
    companyId: resolvedCompanyId,
    role: input.role,
    email: input.email,
    displayName: input.displayName,
  });
}

export async function updateUserRole(userId: string, role: UserRole, companyId?: string): Promise<void> {
  assertFirestoreReady();
  const resolvedCompanyId = await resolveCompanyIdOrThrow(companyId);

  const memberRef = doc(db!, "companies", resolvedCompanyId, "members", userId);
  const userRef = doc(db!, "users", userId);

  await updateDoc(memberRef, { role });

  const currentUid = auth?.currentUser?.uid;
  if (!currentUid) {
    return;
  }

  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    return;
  }

  const currentCompanyId = userSnap.data().companyId as string | undefined;
  if (currentCompanyId === resolvedCompanyId) {
    await updateDoc(userRef, { role });
  }
}
