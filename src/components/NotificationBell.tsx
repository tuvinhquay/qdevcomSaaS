"use client";

import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900/60 text-sm text-slate-100 transition hover:bg-slate-800/80"
      aria-label="Open notifications"
      title="Notifications"
    >
      <span>🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
