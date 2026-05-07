"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import { getSecurityWidgetState, useSecurityMonitor, type SecurityWidgetState } from "@/security/useSecurityMonitor";

const modules = [
  {
    name: "Work Orders",
    href: "/work-orders",
    status: "Live CRUD",
    description: "Role + tenant scoped CRUD is active.",
  },
  {
    name: "Production",
    href: "/production",
    status: "Ready for Prompt 7",
    description: "Permission and rules are in place.",
  },
  {
    name: "Warehouse",
    href: "/warehouse",
    status: "Ready for Prompt 8",
    description: "Tenant role boundary is configured.",
  },
  {
    name: "Chat",
    href: "/chat",
    status: "Foundation ready",
    description: "Access model is integrated with AuthProvider.",
  },
];

export default function DashboardPage() {
  const { tenantId, currentUserRole, user } = useAuth();
  const [securityState, setSecurityState] = useState<SecurityWidgetState>({
    threatLevel: "SAFE",
    unusualLoginCount: 0,
    latestAlertAt: null,
  });

  const { result } = useSecurityMonitor({
    tenantId,
    userId: user?.uid ?? null,
    enabled: process.env.NEXT_PUBLIC_SECURITY_ENABLE !== "false",
  });

  useEffect(() => {
    if (!tenantId || !user?.uid) return;

    let cancelled = false;

    const load = async () => {
      const nextState = await getSecurityWidgetState(tenantId, user.uid);
      if (!cancelled) setSecurityState(nextState);
    };

    void load();
    const timer = window.setInterval(() => void load(), 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tenantId, user?.uid, result]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-300">Platform status after Prompt 6 implementation.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
          Tenant: {tenantId ?? "not loaded"}
        </span>
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
          Role: {currentUserRole ?? "not loaded"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-100">🛡 Security Status</h2>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-100">
              {securityState.threatLevel}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Unusual login count: <span className="font-semibold text-slate-100">{securityState.unusualLoginCount}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Latest alert:{" "}
            <span className="font-semibold text-slate-100">
              {securityState.latestAlertAt
                ? new Date(securityState.latestAlertAt).toLocaleString()
                : "No alerts"}
            </span>
          </p>
        </div>

        {modules.map((module) => (
          <Link
            key={module.name}
            href={module.href}
            className="rounded-xl border border-white/15 bg-slate-950/35 p-4 transition hover:border-white/35 hover:bg-slate-900/50"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-100">{module.name}</h2>
              <span className="rounded-full border border-sky-300/40 bg-sky-500/15 px-2 py-0.5 text-xs text-sky-100">
                {module.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{module.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
