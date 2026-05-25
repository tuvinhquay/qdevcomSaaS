"use client";

import { useAuth } from "@/core/auth/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { markAsRead, type AppNotification } from "@/services/notification_service";

const typeIcon: Record<string, string> = {
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
  error: "🚨",
};

function formatCreatedAt(value: unknown) {
  if (!value) return "just now";
  if (typeof value === "object" && value && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString();
  }
  if (typeof value === "number") return new Date(value).toLocaleString();
  return "just now";
}

export default function NotificationsPage() {
  const { tenantId, user } = useAuth();
  const { notifications, unreadCount } = useNotifications();

  const handleMarkRead = async (item: AppNotification) => {
    if (!tenantId || !user?.uid || !item.id) return;
    await markAsRead(tenantId, item.id, user.uid);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Notification Center</h1>
          <p className="mt-1 text-sm text-slate-300">Realtime notifications from production, warehouse, security, and system.</p>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">
          Unread: {unreadCount}
        </span>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-white/15 bg-slate-950/35 p-4 text-sm text-slate-300">
            No notifications.
          </div>
        ) : (
          notifications.map((item) => {
            const isRead = !!user?.uid && (item.readBy || []).includes(user.uid);
            return (
              <button
                key={item.id}
                onClick={() => void handleMarkRead(item)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/35 p-4 text-left transition hover:border-white/35 hover:bg-slate-900/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {typeIcon[item.type] || "🔔"} {item.title}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Module: {item.module} • {formatCreatedAt(item.createdAt)}
                    </p>
                  </div>
                  {!isRead && (
                    <span className="rounded-full border border-sky-300/40 bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-100">
                      unread
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
