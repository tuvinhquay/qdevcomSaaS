"use client";

import { useEffect, useState } from "react";
import { useSecurityMonitor } from "@/security/useSecurityMonitor";

type Alert = {
  id: string;
  type: string;
  level: "low" | "medium" | "high" | "critical";
  message: string;
  createdAt?: unknown;
  ip?: string;
};

export default function SecurityAdminPage() {
  const { alerts, threatScore } = useSecurityMonitor();
  const [systemStatus, setSystemStatus] = useState("SAFE");

  useEffect(() => {
    if (threatScore > 80) setSystemStatus("CRITICAL");
    else if (threatScore > 50) setSystemStatus("DANGER");
    else if (threatScore > 25) setSystemStatus("WARNING");
    else setSystemStatus("SAFE");
  }, [threatScore]);

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-3xl font-bold">Security Command Center</h1>

      <div className="rounded-xl border bg-black/40 p-6">
        <h2 className="mb-2 text-xl font-semibold">System Threat Level</h2>
        <div className="text-4xl font-bold">{systemStatus}</div>
        <div className="opacity-70">Threat Score: {threatScore}/100</div>
      </div>

      <div className="rounded-xl border bg-black/40 p-6">
        <h2 className="mb-4 text-xl font-semibold">Live Alerts</h2>

        <div className="space-y-3">
          {alerts.map((alert: Alert) => (
            <div key={alert.id} className="rounded-lg border bg-red-500/10 p-4">
              <div className="font-semibold">
                [{alert.level?.toUpperCase?.() ?? "INFO"}] {alert.type}
              </div>
              <div className="text-sm opacity-80">{alert.message}</div>
              <div className="text-xs opacity-50">
                {alert.createdAt ? JSON.stringify(alert.createdAt) : "just now"}{" "}
                {alert.ip && `• IP: ${alert.ip}`}
              </div>
            </div>
          ))}

          {alerts.length === 0 && <div className="opacity-60">No threats detected</div>}
        </div>
      </div>

      <div className="rounded-xl border border-red-600 bg-red-900/30 p-6">
        <h2 className="mb-2 text-xl font-semibold">Emergency Controls</h2>
        <button className="rounded-lg bg-red-600 px-6 py-3 font-bold">LOCKDOWN MODE</button>
      </div>
    </div>
  );
}
