"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import { db } from "@/services/firebase";
import { addProductionLog } from "@/services/production_service";
import { collection, onSnapshot } from "firebase/firestore";

type WorkOrderItem = {
  id: string;
  orderId: string;
  stage: string;
  machine: string;
  targetQuantity: number;
  completedQuantity: number;
  status: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapWorkOrder(id: string, raw: Record<string, unknown>): WorkOrderItem {
  const target = toNumber(raw.targetQuantity) || toNumber(raw.quantity);
  const completed = toNumber(raw.completedQuantity) || toNumber(raw.producedQuantity);

  return {
    id,
    orderId: String(raw.orderId || raw.orderCode || "N/A"),
    stage: String(raw.stage || raw.title || "Chua xac dinh"),
    machine: String(raw.machine || "Chua gan may"),
    targetQuantity: target,
    completedQuantity: completed,
    status: String(raw.status || "pending"),
  };
}

export default function ProductionPage() {
  const { tenantId, user, loading } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderItem | null>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!tenantId || !db) return;

    const ref = collection(db, "tenants", tenantId, "work_orders");

    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => mapWorkOrder(item.id, item.data() as Record<string, unknown>))
          .filter((item) => item.status !== "completed");

        setWorkOrders(list);
      },
      (snapshotError) => {
        setError(snapshotError.message || "Khong the tai danh sach work order.");
      },
    );

    return () => unsub();
  }, [tenantId]);

  const workerName = user?.displayName || user?.email || "Worker";

  const progress = useMemo(() => {
    if (!selectedWorkOrder) return 0;
    if (selectedWorkOrder.targetQuantity <= 0) return 0;

    return Math.min(
      100,
      Math.round((selectedWorkOrder.completedQuantity / selectedWorkOrder.targetQuantity) * 100),
    );
  }, [selectedWorkOrder]);

  const closeModal = () => {
    setSelectedWorkOrder(null);
    setQuantity("");
    setNote("");
  };

  const handleSaveProduction = async () => {
    if (!tenantId || !user?.uid || !selectedWorkOrder) {
      setToast("Thieu tenant hoac thong tin worker.");
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setToast("So luong phai lon hon 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await addProductionLog({
        tenantId,
        workOrderId: selectedWorkOrder.id,
        orderId: selectedWorkOrder.orderId,
        workerId: user.uid,
        workerName,
        department: "Production",
        quantity: parsedQuantity,
        note,
      });

      setToast("Luu san luong thanh cong.");
      closeModal();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Khong the luu san luong.";
      setToast(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Dang tai module Production...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Production Logging</h1>
        <p className="mt-1 text-sm text-slate-300">
          Cong nhan nhap san luong thuc te de cap nhat Work Order, Warehouse va Dashboard realtime.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/35">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/60 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Cong doan</th>
              <th className="px-4 py-3">May</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-300">
                  Khong co Work Order dang xu ly.
                </td>
              </tr>
            ) : (
              workOrders.map((item) => {
                const itemProgress =
                  item.targetQuantity > 0
                    ? Math.min(100, Math.round((item.completedQuantity / item.targetQuantity) * 100))
                    : 0;

                return (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-slate-100">{item.orderId}</td>
                    <td className="px-4 py-3 text-slate-200">{item.stage}</td>
                    <td className="px-4 py-3 text-slate-200">{item.machine}</td>
                    <td className="px-4 py-3 text-slate-200">{item.targetQuantity}</td>
                    <td className="px-4 py-3 text-slate-200">{item.completedQuantity}</td>
                    <td className="px-4 py-3 text-slate-200">{itemProgress}%</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedWorkOrder(item)}
                        className="rounded-md border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
                      >
                        Nhap san luong
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedWorkOrder ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg rounded-xl border border-white/20 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Nhap san luong</h2>
            <p className="mt-1 text-sm text-slate-300">
              {selectedWorkOrder.orderId} - {selectedWorkOrder.stage}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-slate-400">Worker name</p>
                <p className="rounded-md border border-white/15 bg-slate-950/50 px-3 py-2 text-sm text-slate-100">
                  {workerName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Progress hien tai</p>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-300">{progress}%</p>
              </div>

              <div>
                <label className="text-xs text-slate-400" htmlFor="quantity">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                  placeholder="Nhap so luong"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400" htmlFor="note">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                  placeholder="Ghi chu"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProduction()}
                disabled={saving}
                className="rounded-md border border-emerald-300/50 bg-emerald-500/25 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-60"
              >
                {saving ? "Dang luu..." : "+ LUU SAN LUONG"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-white/20 bg-slate-900/95 px-4 py-2 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
