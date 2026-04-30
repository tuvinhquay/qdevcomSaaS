"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import { seedSampleData } from "@/services/seedSampleData";

export default function SeedSampleDataButton() {
  const { tenantId } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSeed = async () => {
    if (!tenantId) {
      setToast({ type: "error", message: "Tenant chưa sẵn sàng." });
      return;
    }

    const confirmed = window.confirm("Bạn có chắc muốn tạo dữ liệu demo không?");
    if (!confirmed) return;

    try {
      setIsSeeding(true);
      const result = await seedSampleData();
      console.info("Seed sample data completed", result);
      setToast({
        type: "success",
        message: "✅ Dữ liệu demo đã tạo xong.",
      });
    } catch (error) {
      console.error("Seed sample data failed", error);
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Seed dữ liệu demo thất bại.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Demo Seed</h2>
          <p className="mt-1 text-xs text-amber-50/90">
            Tạo nhanh dữ liệu demo cho Chat, Work Orders, Production và Warehouse.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSeed()}
          disabled={isSeeding || !tenantId}
          title="Tạo dữ liệu demo cho Chat, Work Orders, Production, Warehouse"
          className="rounded-md border border-amber-300/60 bg-amber-400/20 px-3 py-2 text-sm font-medium text-amber-50 hover:bg-amber-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSeeding ? "Đang tạo..." : "Tạo dữ liệu mẫu"}
        </button>
      </div>

      {toast && (
        <p
          className={[
            "mt-3 rounded-md border px-3 py-2 text-sm",
            toast.type === "success"
              ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-100"
              : "border-rose-300/50 bg-rose-500/20 text-rose-100",
          ].join(" ")}
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}
