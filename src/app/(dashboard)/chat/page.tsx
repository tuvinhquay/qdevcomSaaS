"use client";

import ModuleStatusPanel from "@/components/ui/ModuleStatusPanel";

export default function ChatPage() {
  return (
    <ModuleStatusPanel
      title="Chat"
      description="Tenant-aware chat module foundation is connected to role system."
      requiredPermission="access_chat"
      readyItems={[
        "Role-aware dashboard access is active",
        "Tenant context is available from AuthProvider",
        "Firestore multi-tenant rules are deployed",
      ]}
      nextItems={[
        "Real conversation threads and message list",
        "Realtime sync with Firestore listeners",
        "Role-based moderation actions",
      ]}
    />
  );
}
