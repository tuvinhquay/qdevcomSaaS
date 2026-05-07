import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { detectUserAnomaly, type UserActivity } from "@/security/anomalyDetector";
import { dispatchSecurityAlert } from "@/security/alertCenter";
import { checkApiRateLimit, checkAuthRateLimit } from "@/security/rateLimiter";
import { logSecurityEvent } from "@/security/securityLogger";
import { evaluateSessionRisk } from "@/security/sessionGuard";
import { evaluateThreat, type ThreatEvaluation } from "@/security/threatEngine";

export type SecurityMonitorContext = {
  tenantId: string;
  userId: string;
  ip: string;
  country: string;
  device: string;
  activity: UserActivity;
};

export type SecurityMonitorResult = {
  evaluation: ThreatEvaluation;
  anomalyReason: string;
  riskFlags: string[];
};

export async function runSecurityMonitor(context: SecurityMonitorContext): Promise<SecurityMonitorResult> {
  const authRate = checkAuthRateLimit(context.ip);
  const apiRate = checkApiRateLimit(context.userId);

  if (!authRate.allowed || !apiRate.allowed) {
    await logSecurityEvent("rate_limit_exceeded", "high", {
      tenantId: context.tenantId,
      ip: context.ip,
      device: context.device,
      metadata: {
        authAllowed: authRate.allowed,
        apiAllowed: apiRate.allowed,
        authBlockedUntil: authRate.blockedUntil ?? null,
        apiBlockedUntil: apiRate.blockedUntil ?? null,
      },
    });
  }

  const session = await evaluateSessionRisk({
    tenantId: context.tenantId,
    userId: context.userId,
    ip: context.ip,
    country: context.country,
    device: context.device,
  });

  const anomaly = detectUserAnomaly(context.activity);

  const evaluation = evaluateThreat({
    sessionRisk: session.riskScore,
    anomalyScore: anomaly.anomalyScore,
    rateLimitStatus: { authAllowed: authRate.allowed, apiAllowed: apiRate.allowed },
  });

  await logSecurityEvent("threat_evaluated", evaluation.threatLevel === "CRITICAL" ? "critical" : "medium", {
    tenantId: context.tenantId,
    ip: context.ip,
    device: context.device,
    metadata: {
      score: evaluation.score,
      threatLevel: evaluation.threatLevel,
      action: evaluation.action,
      riskFlags: session.flags,
      anomalyReason: anomaly.reason,
      country: context.country,
      clientTimestamp: Date.now(),
    },
  });

  if (evaluation.threatLevel === "CRITICAL" && db) {
    const lockMinutes = Number(process.env.ACCOUNT_LOCK_MINUTES ?? 30);
    const lockUntil = Date.now() + lockMinutes * 60_000;

    await setDoc(
      doc(db, "tenants", context.tenantId, "security_state", context.userId),
      {
        userId: context.userId,
        lockUntil,
        forcedPasswordReset: true,
        threatLevel: "CRITICAL",
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    await logSecurityEvent("account_locked", "critical", {
      tenantId: context.tenantId,
      ip: context.ip,
      device: context.device,
      metadata: { lockUntil, lockMinutes },
    });

    if (auth) await signOut(auth);
  }

  await dispatchSecurityAlert({
    tenantId: context.tenantId,
    message:
      "?? Chung toi phat hien hoat dong bat thuong tren tai khoan cua ban. Neu khong phai ban, hay doi mat khau ngay.",
    threat: evaluation,
  });

  return { evaluation, anomalyReason: anomaly.reason, riskFlags: session.flags };
}

export type SecurityWidgetState = {
  threatLevel: ThreatEvaluation["threatLevel"];
  unusualLoginCount: number;
  latestAlertAt: number | null;
};

export async function getSecurityWidgetState(tenantId: string, userId: string): Promise<SecurityWidgetState> {
  if (!db) return { threatLevel: "SAFE", unusualLoginCount: 0, latestAlertAt: null };

  const q = query(
    collection(db, "tenants", tenantId, "security_logs"),
    orderBy("timestamp", "desc"),
    limit(50),
  );
  const snapshot = await getDocs(q);
  const userEvents = snapshot.docs.map((item) => item.data()).filter((item) => item.userId === userId);

  const unusualLoginCount = userEvents.filter(
    (item) =>
      item.eventType === "login_new_country" ||
      item.eventType === "login_new_device" ||
      item.eventType === "multiple_ip_short_time",
  ).length;

  const lastThreat = userEvents.find((item) => item.eventType === "threat_evaluated");
  const alertEvent = userEvents.find((item) => item.eventType === "alert_sent");

  return {
    threatLevel: (lastThreat?.metadata?.threatLevel as SecurityWidgetState["threatLevel"]) || "SAFE",
    unusualLoginCount,
    latestAlertAt:
      typeof alertEvent?.metadata?.clientTimestamp === "number"
        ? alertEvent.metadata.clientTimestamp
        : null,
  };
}

// Hook monitor toan cuc: co the goi khi login, khi user mo dashboard, va truoc khi goi API.
export function useSecurityMonitor(triggerContext?: {
  tenantId?: string | null;
  userId?: string | null;
  enabled?: boolean;
}) {
  const [result, setResult] = useState<SecurityMonitorResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!triggerContext?.enabled) return;
    if (!triggerContext.tenantId || !triggerContext.userId) return;
    const tenantId = triggerContext.tenantId;
    const userId = triggerContext.userId;

    let cancelled = false;

    const run = async () => {
      setRunning(true);
      try {
        const computed = await runSecurityMonitor({
          tenantId,
          userId,
          ip: "client-ip-unknown",
          country: "unknown",
          device: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          activity: {
            projectCreatedPerMinute: 0,
            dataExportCount: 0,
            apiCallsPerMinute: 0,
            loginCountPerHour: 1,
          },
        });
        if (!cancelled) setResult(computed);
      } finally {
        if (!cancelled) setRunning(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [triggerContext?.enabled, triggerContext?.tenantId, triggerContext?.userId]);

  return { running, result };
}
