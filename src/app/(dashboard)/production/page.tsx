"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrderById,
  getProductionOrders,
  updateProductionOrder,
} from "@/core/firestore/productionRepo";
import { useAuth } from "@/core/auth/AuthProvider";
import { type ProductionOrder, type ProductionStatus } from "@/types/production";

type FormState = {
  workOrderId: string;
  title: string;
  description: string;
  quantity: string;
  producedQuantity: string;
  status: ProductionStatus;
  dueDate: string;
  assignedTo: string;
};

const STATUS_OPTIONS: ProductionStatus[] = [
  "planned",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
];

const EMPTY_FORM: FormState = {
  workOrderId: "",
  title: "",
  description: "",
  quantity: "0",
  producedQuantity: "0",
  status: "planned",
  dueDate: "",
  assignedTo: "",
};

function toDateInputValue(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

export default function ProductionPage() {
  const { loading, currentUserRole } = useAuth();

  const [items, setItems] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | ProductionStatus>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionOrder | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canRead =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "staff";
  const canCreateEdit =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager";
  const canDelete = currentUserRole === "owner" || currentUserRole === "admin";

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") {
      return items;
    }
    return items.filter((item) => item.status === filterStatus);
  }, [items, filterStatus]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadItems = async () => {
    if (!canRead) return;

    try {
      setIsLoading(true);
      const data = await getProductionOrders();
      setItems(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load production orders.";
      setToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [currentUserRole]);

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingItem(null);
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (item: ProductionOrder) => {
    setEditingItem(item);
    setFormState({
      workOrderId: item.workOrderId ?? "",
      title: item.title,
      description: item.description ?? "",
      quantity: String(item.quantity),
      producedQuantity: String(item.producedQuantity),
      status: item.status,
      dueDate: toDateInputValue(item.dueDate),
      assignedTo: item.assignedTo ?? "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const validateForm = (): string | null => {
    if (!formState.title.trim()) return "Title is required.";
    if (!formState.quantity.trim()) return "Quantity is required.";

    const quantity = Number(formState.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return "Quantity must be greater than 0.";
    }

    const produced = Number(formState.producedQuantity || "0");
    if (Number.isNaN(produced) || produced < 0) {
      return "Produced quantity must be 0 or more.";
    }

    return null;
  };

  const handleSubmit = async () => {
    const errorMessage = validateForm();
    if (errorMessage) {
      setFormError(errorMessage);
      return;
    }

    const dueDateMs = formState.dueDate ? new Date(formState.dueDate).getTime() : undefined;
    const quantity = Number(formState.quantity);
    const producedQuantity = Number(formState.producedQuantity || "0");

    try {
      setIsSaving(true);
      setFormError(null);

      const payload = {
        workOrderId: formState.workOrderId.trim() || undefined,
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        quantity,
        producedQuantity,
        status: formState.status,
        dueDate: dueDateMs,
        assignedTo: formState.assignedTo.trim() || undefined,
      };

      if (editingItem) {
        await updateProductionOrder(editingItem.id, payload);
        setToast("Production order updated.");
      } else {
        await createProductionOrder(payload);
        setToast("Production order created.");
      }

      closeModal();
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save production order.";
      setFormError(message);
      setToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ProductionOrder) => {
    if (!window.confirm(`Delete production order \"${item.title}\"?`)) {
      return;
    }

    try {
      await deleteProductionOrder(item.id);
      setToast("Production order deleted.");
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete production order.";
      setToast(message);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const item = await getProductionOrderById(id);
      if (!item) {
        setToast("Production order not found.");
        return;
      }
      openEditModal(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load production order.";
      setToast(message);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Loading production module...</p>;
  }

  if (!canRead) {
    return <p className="text-sm font-semibold text-rose-200">Access denied</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Production Orders</h1>
          <p className="mt-1 text-sm text-slate-300">Track production flow from planning to completion.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as "all" | ProductionStatus)}
            className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {canCreateEdit && (
            <button
              onClick={openCreateModal}
              className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/35"
            >
              New Production Order
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/35">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/50 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Produced</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-300">
                  Loading data...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-300">
                  No production orders found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-100">{item.title}</td>
                  <td className="px-4 py-3 text-slate-200">{item.status}</td>
                  <td className="px-4 py-3 text-slate-200">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-200">{item.producedQuantity}</td>
                  <td className="px-4 py-3 text-slate-200">{item.assignedTo ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-200">{formatDueDate(item.dueDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => void handleOpenDetail(item.id)}
                        className="rounded border border-white/25 px-2.5 py-1 text-xs text-slate-100 hover:bg-white/10"
                      >
                        Edit
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => void handleDelete(item)}
                          className="rounded border border-rose-300/50 px-2.5 py-1 text-xs text-rose-100 hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-xl border border-white/20 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingItem ? "Edit Production Order" : "Create Production Order"}
            </h2>

            <div className="mt-4 grid gap-3">
              <input
                value={formState.workOrderId}
                onChange={(event) => setFormState((prev) => ({ ...prev, workOrderId: event.target.value }))}
                placeholder="WorkOrder ID (optional)"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              {formState.workOrderId.trim() && (
                <div className="inline-flex w-fit rounded-full border border-sky-300/40 bg-sky-500/15 px-3 py-1 text-xs text-sky-100">
                  Linked to WorkOrder: {formState.workOrderId.trim()}
                </div>
              )}

              <input
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Title"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder="Description"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={formState.quantity}
                  onChange={(event) => setFormState((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="Quantity"
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />

                <input
                  type="number"
                  min={0}
                  value={formState.producedQuantity}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, producedQuantity: event.target.value }))
                  }
                  placeholder="Produced Quantity"
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: event.target.value as ProductionStatus }))
                  }
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <input
                value={formState.assignedTo}
                onChange={(event) => setFormState((prev) => ({ ...prev, assignedTo: event.target.value }))}
                placeholder="Assigned To (userId, optional)"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            {formError && (
              <p className="mt-3 rounded-md border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
                {formError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={isSaving}
                className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : editingItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-white/20 bg-slate-900/95 px-4 py-2 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
