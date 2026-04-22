"use client";

import ModuleStatusPanel from "@/components/ui/ModuleStatusPanel";

export default function WarehousePage() {
  return (
    <ModuleStatusPanel
      title="Warehouse"
      description="Warehouse module now reflects role and tenant readiness instead of placeholder UI."
      requiredPermission="access_warehouse"
      readyItems={[
        "Owner/Admin/Staff visibility is controlled",
        "Tenant scope is enforced in security rules",
        "Sidebar visibility follows role mapping",
      ]}
      nextItems={[
        "Inventory item CRUD",
        "Stock in/out transaction logs",
        "Low-stock alert and dashboard cards",
      ]}
    />
  );
}
