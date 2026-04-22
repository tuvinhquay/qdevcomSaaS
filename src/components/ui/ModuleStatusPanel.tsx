"use client";

import { useAuth } from "@/core/auth/AuthProvider";
import { roleHasPermission, type Permission } from "@/core/firestore/firestoreClient";

type ModuleStatusPanelProps = {
  title: string;
  description: string;
  requiredPermission: Permission;
  readyItems: string[];
  nextItems: string[];
};

export default function ModuleStatusPanel({
  title,
  description,
  requiredPermission,
  readyItems,
  nextItems,
}: ModuleStatusPanelProps) {
  const { tenantId, currentUserRole } = useAuth();

  const canAccess = currentUserRole
    ? roleHasPermission(currentUserRole, requiredPermission)
    : false;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>

      <div className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
            Tenant: {tenantId ?? "not loaded"}
          </span>
          <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
            Role: {currentUserRole ?? "not loaded"}
          </span>
          <span
            className={[
              "rounded-full border px-2.5 py-1",
              canAccess
                ? "border-emerald-300/50 text-emerald-200"
                : "border-rose-300/50 text-rose-200",
            ].join(" ")}
          >
            {canAccess ? "Access granted" : "Access limited"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
          <h2 className="text-sm font-semibold text-emerald-100">Ready now</h2>
          <ul className="mt-2 space-y-1 text-sm text-emerald-50/90">
            {readyItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-sky-300/25 bg-sky-500/10 p-4">
          <h2 className="text-sm font-semibold text-sky-100">Next upgrades</h2>
          <ul className="mt-2 space-y-1 text-sm text-sky-50/90">
            {nextItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
