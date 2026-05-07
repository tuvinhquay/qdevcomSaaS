import { logSecurityEvent } from "@/security/securityLogger";
import type { ThreatEvaluation } from "@/security/threatEngine";

export type AlertPayload = {
  tenantId: string;
  message: string;
  threat: ThreatEvaluation;
};

export async function dispatchSecurityAlert(payload: AlertPayload): Promise<{ inApp: boolean; email: boolean }> {
  if (payload.threat.threatLevel === "SAFE" || payload.threat.threatLevel === "SUSPICIOUS") {
    return { inApp: false, email: false };
  }

  await logSecurityEvent("alert_sent", payload.threat.threatLevel === "CRITICAL" ? "critical" : "high", {
    tenantId: payload.tenantId,
    metadata: {
      message: payload.message,
      threatLevel: payload.threat.threatLevel,
      score: payload.threat.score,
      channels: ["in_app", "email"],
    },
  });

  return { inApp: true, email: true };
}
