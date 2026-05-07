import { db, auth } from "@/services/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export type SecurityEventType =
  | "login_new_country"
  | "login_new_device"
  | "multiple_ip_short_time"
  | "rate_limit_exceeded"
  | "anomaly_detected"
  | "threat_evaluated"
  | "account_locked"
  | "alert_sent";

export type SecurityEventDetails = {
  tenantId: string;
  ip?: string;
  device?: string;
  metadata?: Record<string, unknown>;
};

// Ghi log bao mat theo tenant de phan tach du lieu da tenant.
export async function logSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  details: SecurityEventDetails,
) {
  if (!db) return;

  await addDoc(collection(db, "tenants", details.tenantId, "security_logs"), {
    timestamp: serverTimestamp(),
    userId: auth?.currentUser?.uid ?? null,
    ip: details.ip ?? "unknown",
    device: details.device ?? "unknown",
    eventType: type,
    severity,
    metadata: details.metadata ?? {},
  });
}
