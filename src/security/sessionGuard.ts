import { db } from "@/services/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

export type SessionContext = {
  tenantId: string;
  userId: string;
  ip: string;
  country: string;
  device: string;
};

export type SessionRiskResult = {
  riskScore: number;
  flags: string[];
};

// Kiem tra session dang nhap bat thuong dua tren lich su su kien dang nhap.
export async function evaluateSessionRisk(context: SessionContext): Promise<SessionRiskResult> {
  if (!db) return { riskScore: 0, flags: [] };

  const q = query(
    collection(db, "tenants", context.tenantId, "security_logs"),
    orderBy("timestamp", "desc"),
    limit(20),
  );
  const snapshot = await getDocs(q);

  const events = snapshot.docs
    .map((item) => item.data())
    .filter((item) => item.userId === context.userId);

  const flags: string[] = [];
  let riskScore = 0;

  const hasCountry = events.some((item) => String(item.metadata?.country ?? "") === context.country);
  if (!hasCountry) {
    flags.push("Login from new country");
    riskScore += 30;
  }

  const hasDevice = events.some((item) => String(item.device ?? "") === context.device);
  if (!hasDevice) {
    flags.push("Login from new device");
    riskScore += 25;
  }

  const now = Date.now();
  const recentIpSet = new Set(
    events
      .filter((item) => {
        const ts = Number(item.metadata?.clientTimestamp ?? 0);
        return now - ts <= 5 * 60_000;
      })
      .map((item) => String(item.ip ?? "")),
  );

  if (recentIpSet.size >= 2 && !recentIpSet.has(context.ip)) {
    flags.push("Multiple IPs in 5 minutes");
    riskScore += 35;
  }

  return { riskScore: Math.min(100, riskScore), flags };
}
