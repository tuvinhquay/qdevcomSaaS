"use client";

import { auth, db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { type UserRole } from "@/core/firestore/firestoreClient";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return (userSnap.data().role as UserRole | undefined) ?? null;
}
