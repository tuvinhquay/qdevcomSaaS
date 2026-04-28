"use client";

import { auth, db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCurrentUserRole } from "@/core/firestore/firestoreClient";

export type AIContext = {
  userId: string;
  companyId: string;
  role: string;
};

function assertFirebaseReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

export async function getAIContext(): Promise<AIContext> {
  assertFirebaseReady();

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("User is not authenticated.");
  }

  // Luôn đọc user profile để lấy companyId làm scope bắt buộc cho mọi truy vấn.
  const userRef = doc(db!, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User profile not found.");
  }

  const userData = userSnap.data();
  const companyId = (userData.companyId as string | undefined)?.trim() ?? "";
  if (!companyId) {
    throw new Error("Company ID is missing in user profile.");
  }

  const roleFromUser = (userData.role as string | undefined)?.trim();
  const role = roleFromUser || (await getCurrentUserRole(companyId)) || "staff";

  return {
    userId: currentUser.uid,
    companyId,
    role,
  };
}
