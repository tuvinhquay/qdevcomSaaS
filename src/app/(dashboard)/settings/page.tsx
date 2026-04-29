"use client";

import ModuleStatusPanel from "@/components/ui/ModuleStatusPanel";
import SeedSampleDataButton from "@/modules/settings/SeedSampleDataButton";

export default function SettingsPage() {
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

      <SeedSampleDataButton />
    </div>
  );
}
