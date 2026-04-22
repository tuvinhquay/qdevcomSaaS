"use client";

import ModuleStatusPanel from "@/components/ui/ModuleStatusPanel";

export default function ProductionPage() {
  return (
    <ModuleStatusPanel
      title="Production"
      description="Production area is prepared with permission boundaries for manager-level operations."
      requiredPermission="access_production"
      readyItems={[
        "Owner/Admin/Manager role gates are active",
        "Data layer permission check pattern is ready",
        "Security rules already isolate data by tenant",
      ]}
      nextItems={[
        "Production order CRUD screen",
        "Stage workflow and status transitions",
        "Assignment and schedule view",
      ]}
    />
  );
}
