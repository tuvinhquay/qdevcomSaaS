"use client";

import { useMemo } from "react";

export type SecurityAlert = {
  id: string;
  type: string;
  level: "low" | "medium" | "high" | "critical";
  message: string;
  time: string;
  ip?: string;
};

const demoAlerts: SecurityAlert[] = [
  {
    id: "1",
    type: "RATE_LIMIT",
    level: "high",
    message: "Too many login attempts detected",
    time: new Date().toLocaleTimeString(),
    ip: "185.22.12.44",
  },
  {
    id: "2",
    type: "SUSPICIOUS_SESSION",
    level: "critical",
    message: "Possible session hijacking",
    time: new Date().toLocaleTimeString(),
    ip: "103.21.244.1",
  },
];

// Hook monitor bao mat cho Security Center UI.
export function useSecurityMonitor() {
  const alerts = useMemo(
    () =>
      demoAlerts.map((item) => ({
        ...item,
        time: new Date().toLocaleTimeString(),
      })),
    [],
  );

  return {
    alerts,
    threatScore: 67,
  };
}
