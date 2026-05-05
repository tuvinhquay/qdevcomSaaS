"use client";

import { useState } from "react";
import ModuleStatusPanel from "@/components/ui/ModuleStatusPanel";
import { useAuth } from "@/core/auth/AuthProvider";
import { seedTenantSampleData } from "@/services/seed_service";

export default function SettingsPage() {
  const { tenantId, user } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleCreateSampleData = async () => {
    if (!tenantId || !user?.uid) {
      setMessage("Tenant hoac nguoi dung chua san sang.");
      return;
    }

    try {
      setIsSeeding(true);
      setMessage("");

      const result = await seedTenantSampleData(tenantId, user.uid);
      setMessage(
        `Seed thanh cong - workers: ${result.workers}, orders: ${result.orders}, work_orders: ${result.workOrders}, warehouse_items: ${result.warehouseItems}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the seed sample data.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <ModuleStatusPanel
        title="Settings"
        description="Company settings screen is now role-aware and ready for tenant configuration forms."
        requiredPermission="access_settings"
        readyItems={[
          "Only Owner/Admin can open this module",
          "Current tenant and role are visible",
          "Permission model is centralized in firestoreClient",
        ]}
        nextItems={[
          "Company profile editor",
          "Module toggle management",
          "Member role assignment UI",
        ]}
      />

      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Foundation Seed</p>
            <p className="text-xs text-white/80">
              Tao du lieu mau cho workers, orders, work_orders va warehouse_items theo tenant.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCreateSampleData()}
            disabled={isSeeding || !tenantId || !user?.uid}
            className="rounded-xl border border-emerald-300/50 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSeeding ? "Dang tao..." : "?? Create Sample Company Data"}
          </button>
        </div>

        {message ? (
          <p className="mt-3 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white/90">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
