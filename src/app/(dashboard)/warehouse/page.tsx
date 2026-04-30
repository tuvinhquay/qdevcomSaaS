"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  createWarehouseItem,
  deleteWarehouseItem,
  getWarehouseItemById,
  getWarehouseItems,
  updateWarehouseItem,
  type WarehouseStatus,
} from "@/core/firestore/warehouseRepo";
import { type WarehouseItem } from "@/types/warehouse";

type FormState = {
  name: string;
  SKU: string;
  quantity: string;
  location: string;
  status: WarehouseStatus;
  assignedTo: string;
  notes: string;
};

const STATUS_OPTIONS: WarehouseStatus[] = ["in_stock", "reserved", "out_of_stock"];

const EMPTY_FORM: FormState = {
  name: "",
  SKU: "",
  quantity: "0",
  location: "",
  status: "in_stock",
  assignedTo: "",
  notes: "",
};

export default function WarehousePage() {
  const { loading, currentCompanyId, currentUserRole } = useAuth();

  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | WarehouseStatus>("all");
  const [searchText, setSearchText] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
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
    const keyword = searchText.trim().toLowerCase();

    return items.filter((item) => {
      const statusOk = statusFilter === "all" || item.status === statusFilter;
      const searchOk =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.SKU.toLowerCase().includes(keyword);

      return statusOk && searchOk;
    });
  }, [items, searchText, statusFilter]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadItems = async () => {
    if (!currentCompanyId || !canRead) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await getWarehouseItems(currentCompanyId);
      setItems(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load warehouse items.";
      setToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [currentCompanyId, currentUserRole]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WarehouseItem) => {
    setEditingItem(item);
    setFormState({
      name: item.name,
      SKU: item.SKU,
      quantity: String(item.quantity),
      location: item.location,
      status: item.status,
      assignedTo: item.assignedTo ?? "",
      notes: item.notes ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formState.name.trim()) return "Name is required.";
    if (!formState.SKU.trim()) return "SKU is required.";
    if (!formState.location.trim()) return "Location is required.";

    const quantity = Number(formState.quantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      return "Quantity must be 0 or greater.";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!currentCompanyId) {
      setFormError("Company is not ready.");
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
        name: formState.name.trim(),
        SKU: formState.SKU.trim(),
        quantity: Number(formState.quantity),
        location: formState.location.trim(),
        status: formState.status,
        assignedTo: formState.assignedTo.trim() || undefined,
        notes: formState.notes.trim() || undefined,
      };

      if (editingItem) {
        await updateWarehouseItem(currentCompanyId, editingItem.id, payload);
        setToast("Warehouse item updated.");
      } else {
        await createWarehouseItem(currentCompanyId, payload);
        setToast("Warehouse item created.");
      }

      closeModal();
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save warehouse item.";
      setFormError(message);
      setToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: WarehouseItem) => {
    if (!currentCompanyId) {
      setToast("Company is not ready.");
      return;
    }

    if (!window.confirm(`Delete warehouse item \"${item.name}\"?`)) {
      return;
    }

    try {
      await deleteWarehouseItem(currentCompanyId, item.id);
      setToast("Warehouse item deleted.");
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete warehouse item.";
      setToast(message);
    }
  };

  const refreshForEdit = async (item: WarehouseItem) => {
    if (!currentCompanyId) return;

    try {
      const latest = await getWarehouseItemById(currentCompanyId, item.id);
      if (!latest) {
        setToast("Warehouse item not found.");
        return;
      }
      openEditModal(latest);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load warehouse item.";
      setToast(message);
    }
  };

  if (loading || !currentCompanyId) {
    return <p className="text-sm text-slate-300">Loading warehouse module...</p>;
  }

  if (!canRead) {
    return <p className="text-sm font-semibold text-rose-200">Access denied</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouse</h1>
          <p className="mt-1 text-sm text-slate-300">Manage stock inventory by tenant and role.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name or SKU"
            className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | WarehouseStatus)}
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
              New Item
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/35">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/50 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-300">
                  Loading data...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-300">
                  No warehouse items found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-100">{item.name}</td>
                  <td className="px-4 py-3 text-slate-200">{item.SKU}</td>
                  <td className="px-4 py-3 text-slate-200">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-200">{item.location}</td>
                  <td className="px-4 py-3 text-slate-200">{item.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {canCreateEdit && (
                        <button
                          onClick={() => void refreshForEdit(item)}
                          className="rounded border border-sky-300/50 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-500/20"
                        >
                          Edit
                        </button>
                      )}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-xl border border-white/20 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingItem ? "Edit Warehouse Item" : "Create Warehouse Item"}
            </h2>

            <div className="mt-4 grid gap-3">
              <input
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Name"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={formState.SKU}
                  onChange={(event) => setFormState((prev) => ({ ...prev, SKU: event.target.value }))}
                  placeholder="SKU"
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  type="number"
                  min={0}
                  value={formState.quantity}
                  onChange={(event) => setFormState((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="Quantity"
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                  placeholder="Location"
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                />
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: event.target.value as WarehouseStatus }))
                  }
                  className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={formState.assignedTo}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, assignedTo: event.target.value }))
                }
                placeholder="Assigned To (optional userId)"
                className="w-full rounded-md border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />

              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                placeholder="Notes (optional)"
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
