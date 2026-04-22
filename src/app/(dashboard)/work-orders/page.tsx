"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  createWorkOrder,
  deleteWorkOrder,
  getWorkOrderById,
  getWorkOrders,
  updateWorkOrder,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/core/firestore/workOrdersRepo";

type FormState = {
  title: string;
  description: string;
  status: WorkOrderStatus;
  assignedTo: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  status: "pending",
  assignedTo: "",
};

const STATUS_OPTIONS: Array<{ label: string; value: WorkOrderStatus }> = [
  { label: "Pending", value: "pending" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function WorkOrdersPage() {
  const { tenantId, currentUserRole, loading } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | WorkOrderStatus>("all");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [detailOrder, setDetailOrder] = useState<WorkOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const canCreateOrEdit = currentUserRole === "owner" || currentUserRole === "admin" || currentUserRole === "manager";
  const canDelete = currentUserRole === "owner" || currentUserRole === "admin";
  const canRead =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "staff";

  const filteredWorkOrders = useMemo(() => {
    if (filterStatus === "all") {
      return workOrders;
    }

    return workOrders.filter((order) => order.status === filterStatus);
  }, [filterStatus, workOrders]);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const loadWorkOrders = async () => {
    if (!tenantId || !canRead) {
      return;
    }

    try {
      setIsLoadingOrders(true);
      const data = await getWorkOrders(tenantId);
      setWorkOrders(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load work orders.";
      setToastMessage(message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadWorkOrders();
  }, [tenantId, currentUserRole]);

  const openCreateForm = () => {
    setEditingOrder(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormState({
      title: order.title,
      description: order.description,
      status: order.status,
      assignedTo: order.assignedTo ?? "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formState.title.trim()) return "Title is required.";
    if (!formState.description.trim()) return "Description is required.";
    if (!formState.status) return "Status is required.";
    return null;
  };

  const handleSubmitForm = async () => {
    if (!tenantId) {
      setFormError("Tenant is not ready.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const payload = {
        title: formState.title.trim(),
        description: formState.description.trim(),
        status: formState.status,
        assignedTo: formState.assignedTo.trim() ? formState.assignedTo.trim() : null,
      };

      if (editingOrder) {
        await updateWorkOrder(tenantId, editingOrder.id, payload);
        setToastMessage("Work order updated.");
      } else {
        await createWorkOrder(tenantId, payload);
        setToastMessage("Work order created.");
      }

      closeForm();
      await loadWorkOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save work order.";
      setFormError(message);
      setToastMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!tenantId) {
      setToastMessage("Tenant is not ready.");
      return;
    }

    const confirmed = window.confirm(`Delete work order \"${order.title}\"?`);
    if (!confirmed) return;

    try {
      await deleteWorkOrder(tenantId, order.id);
      setToastMessage("Work order deleted.");
      await loadWorkOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete work order.";
      setToastMessage(message);
    }
  };

  const openDetailModal = async (order: WorkOrder) => {
    if (!tenantId) return;

    try {
      const latest = await getWorkOrderById(tenantId, order.id);
      setDetailOrder(latest ?? order);
      setIsDetailOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load work order details.";
      setToastMessage(message);
    }
  };

  if (loading || !tenantId) {
    return <p className="text-sm text-slate-300">Loading work orders...</p>;
  }

  if (!canRead) {
    return <p className="text-sm font-semibold text-rose-200">Access denied</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
          <p className="mt-1 text-sm text-slate-300">Manage production work orders by role and tenant scope.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as "all" | WorkOrderStatus)}
            className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All status</option>
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>

          {canCreateOrEdit && (
            <button
              onClick={openCreateForm}
              className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/35"
            >
              New Work Order
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
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingOrders ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-300">
                  Loading data...
                </td>
              </tr>
            ) : filteredWorkOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-300">
                  No work orders found.
                </td>
              </tr>
            ) : (
              filteredWorkOrders.map((order) => (
                <tr key={order.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-100">{order.title}</td>
                  <td className="px-4 py-3 text-slate-200">{order.status}</td>
                  <td className="px-4 py-3 text-slate-200">{order.assignedTo ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-200">{order.createdBy}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => void openDetailModal(order)}
                        className="rounded border border-white/25 px-2.5 py-1 text-xs text-slate-100 hover:bg-white/10"
                      >
                        Detail
                      </button>

                      {canCreateOrEdit && (
                        <button
                          onClick={() => openEditForm(order)}
                          className="rounded border border-sky-300/50 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-500/20"
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => void handleDelete(order)}
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
          <div className="w-full max-w-lg rounded-xl border border-white/20 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingOrder ? "Edit Work Order" : "Create Work Order"}
            </h2>

            <div className="mt-4 space-y-3">
              <input
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Title"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
                rows={4}
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value as WorkOrderStatus }))
                }
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>

              <input
                value={formState.assignedTo}
                onChange={(event) => setFormState((prev) => ({ ...prev, assignedTo: event.target.value }))}
                placeholder="Assigned to (userId, optional)"
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
                onClick={closeForm}
                className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmitForm()}
                disabled={isSaving}
                className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : editingOrder ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDetailOpen && detailOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg rounded-xl border border-white/20 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Work Order Detail</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p><span className="font-medium text-slate-100">Title:</span> {detailOrder.title}</p>
              <p><span className="font-medium text-slate-100">Description:</span> {detailOrder.description}</p>
              <p><span className="font-medium text-slate-100">Status:</span> {detailOrder.status}</p>
              <p><span className="font-medium text-slate-100">Assigned To:</span> {detailOrder.assignedTo ?? "-"}</p>
              <p><span className="font-medium text-slate-100">Created By:</span> {detailOrder.createdBy}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-white/20 bg-slate-900/95 px-4 py-2 text-sm text-slate-100 shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
