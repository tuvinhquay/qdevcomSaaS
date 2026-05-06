"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  type DashboardStats,
  type LowStockItem,
  type TopWorker,
  listenDashboardStats,
} from "@/services/dashboard_service";
import type { AppSettings } from "@/lib/default_settings";

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  completedOrders: 0,
  delayedOrders: 0,
  totalProductionToday: 0,
  totalIncomeToday: 0,
  lowStockCount: 0,
  topWorkers: [],
  productionProgress: {
    target: 0,
    completed: 0,
    percent: 0,
  },
  lowStockItems: [],
};

const copy = {
  vi: {
    title: "Dashboard San xuat Realtime",
    subtitle: "Tong hop so lieu ERP theo tenant theo thoi gian thuc.",
    noData: "Chua co du lieu he thong",
    cards: {
      totalOrders: "Tong don hang",
      completedOrders: "Don hoan thanh",
      delayedOrders: "Don cham tien do",
      totalProductionToday: "San luong hom nay",
      totalIncomeToday: "Thu nhap hom nay",
      lowStockCount: "Canh bao ton kho thap",
    },
    progress: "Tien do san xuat",
    target: "Muc tieu",
    completed: "Da hoan thanh",
    workers: "Top 5 cong nhan",
    stockWarning: "Canh bao vat tu duoi nguong",
    workerName: "Cong nhan",
    monthlyQuantity: "SL thang",
    monthlyIncome: "Thu nhap thang",
    qtyRemain: "Con lai",
    tenant: "Tenant",
    role: "Vai tro",
  },
  en: {
    title: "Realtime Production Dashboard",
    subtitle: "Tenant-scoped ERP metrics streamed from Firestore.",
    noData: "No system data available yet",
    cards: {
      totalOrders: "Total Orders",
      completedOrders: "Completed Orders",
      delayedOrders: "Delayed Orders",
      totalProductionToday: "Production Today",
      totalIncomeToday: "Income Today",
      lowStockCount: "Low Stock Alerts",
    },
    progress: "Production Progress",
    target: "Target",
    completed: "Completed",
    workers: "Top 5 Workers",
    stockWarning: "Low Stock Items",
    workerName: "Worker",
    monthlyQuantity: "Monthly Qty",
    monthlyIncome: "Monthly Income",
    qtyRemain: "Remaining",
    tenant: "Tenant",
    role: "Role",
  },
} as const;

function formatCurrency(value: number, locale: "vi" | "en") {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const { tenantId, currentUserRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    void listenDashboardStats(
      tenantId,
      ({ stats: nextStats, settings: nextSettings }) => {
        if (cancelled) return;
        setStats(nextStats);
        setSettings(nextSettings);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load dashboard data.");
        setLoading(false);
      },
    ).then((unsub) => {
      if (cancelled) {
        unsub();
        return;
      }
      cleanup = unsub;
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [tenantId]);

  const language = String(settings?.languages.default ?? "vi") === "en" ? "en" : "vi";
  const t = copy[language];

  const hasData = useMemo(() => {
    return (
      stats.totalOrders > 0 ||
      stats.totalProductionToday > 0 ||
      stats.lowStockCount > 0 ||
      stats.topWorkers.length > 0
    );
  }, [stats]);

  const cards = [
    { label: t.cards.totalOrders, value: stats.totalOrders, tone: "normal" },
    { label: t.cards.completedOrders, value: stats.completedOrders, tone: "normal" },
    { label: t.cards.delayedOrders, value: stats.delayedOrders, tone: "warn" },
    { label: t.cards.totalProductionToday, value: stats.totalProductionToday, tone: "normal" },
    {
      label: t.cards.totalIncomeToday,
      value: formatCurrency(stats.totalIncomeToday, language),
      tone: "normal",
    },
    { label: t.cards.lowStockCount, value: stats.lowStockCount, tone: "danger" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
          {t.tenant}: {tenantId ?? "not loaded"}
        </span>
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-slate-200">
          {t.role}: {currentUserRole ?? "not loaded"}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const toneClass =
            card.tone === "danger"
              ? "border-rose-300/50 bg-rose-500/10"
              : card.tone === "warn"
                ? "border-amber-300/50 bg-amber-500/10"
                : "border-emerald-300/40 bg-emerald-500/10";

          return (
            <div key={card.label} className={`rounded-xl border p-4 ${toneClass}`}>
              <p className="text-xs uppercase tracking-wide text-slate-300">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
          <h2 className="text-base font-semibold text-white">{t.progress}</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>
              {t.target}: <span className="font-semibold">{stats.productionProgress.target}</span>
            </p>
            <p>
              {t.completed}: <span className="font-semibold">{stats.productionProgress.completed}</span>
            </p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-400 transition-all duration-500"
                style={{ width: `${stats.productionProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-300">{stats.productionProgress.percent}%</p>
          </div>
        </section>

        <section className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
          <h2 className="text-base font-semibold text-white">{t.workers}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">{t.workerName}</th>
                  <th className="pb-2">{t.monthlyQuantity}</th>
                  <th className="pb-2">{t.monthlyIncome}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topWorkers.map((worker: TopWorker) => (
                  <tr key={worker.id} className="border-t border-white/10">
                    <td className="py-2">{worker.workerName}</td>
                    <td className="py-2">{worker.monthlyQuantity}</td>
                    <td className="py-2">{formatCurrency(worker.monthlyIncome, language)}</td>
                  </tr>
                ))}
                {!stats.topWorkers.length ? (
                  <tr>
                    <td className="py-3 text-slate-400" colSpan={3}>
                      {t.noData}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
        <h2 className="text-base font-semibold text-white">{t.stockWarning}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.lowStockItems.map((item: LowStockItem) => (
            <div
              key={item.id}
              className="animate-pulse rounded-lg border border-rose-300/50 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
            >
              <p className="font-semibold">{item.itemName}</p>
              <p className="text-xs">
                {t.qtyRemain}: {item.quantityRemaining}
              </p>
            </div>
          ))}

          {!stats.lowStockItems.length ? (
            <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              OK
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !hasData ? (
        <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t.noData}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Loading realtime dashboard...
        </div>
      ) : null}
    </div>
  );
}
