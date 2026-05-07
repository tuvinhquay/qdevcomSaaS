import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export type SecurityEventType =
  | "LOGIN"
  | "LOGOUT"
  | "RATE_LIMIT"
  | "ANOMALY"
  | "THREAT"
  | "ALERT";

export interface SecurityEvent {
  type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  userId?: string;
  metadata?: unknown;
}

export async function pushSecurityEvent(event: SecurityEvent) {
  if (!db) return;

  try {
    await addDoc(collection(db, "securityEvents"), {
      ...event,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("pushSecurityEvent error", err);
  }
}
