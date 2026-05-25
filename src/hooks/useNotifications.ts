"use client";

import { useAuth } from "@/core/auth/AuthProvider";
import {
  getUnreadCount,
  subscribeNotificationsRealtime,
  type AppNotification,
  type NotificationRole,
} from "@/services/notification_service";
import { useEffect, useState } from "react";

export function useNotifications() {
  const { tenantId, user, currentUserRole } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!tenantId || !user?.uid || !currentUserRole) return;

    const role = currentUserRole as NotificationRole;
    const unsub = subscribeNotificationsRealtime(tenantId, (items) => {
      const visible = items.filter((item) => (item.targetRoles || []).includes(role));
      setNotifications(visible);
      const unread = visible.filter((item) => !(item.readBy || []).includes(user.uid)).length;
      setUnreadCount(unread);
    });

    return () => unsub();
  }, [tenantId, user?.uid, currentUserRole]);

  useEffect(() => {
    if (!tenantId || !user?.uid || !currentUserRole) return;
    const role = currentUserRole as NotificationRole;
    void getUnreadCount(tenantId, user.uid, role).then(setUnreadCount).catch(() => undefined);
  }, [tenantId, user?.uid, currentUserRole]);

  return { notifications, unreadCount };
}
