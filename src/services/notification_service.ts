import { db } from "@/services/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

export type NotificationType = "warning" | "info" | "success" | "error";
export type NotificationModule = "production" | "warehouse" | "security" | "system";
export type NotificationRole = "owner" | "admin" | "manager" | "staff" | "guest";

export type AppNotification = {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  module: NotificationModule;
  readBy: string[];
  targetRoles: NotificationRole[];
  createdAt?: unknown;
};

function ensureDb() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
  return db;
}

export async function createNotification(
  tenantId: string,
  payload: Omit<AppNotification, "id" | "readBy" | "createdAt">,
) {
  const firestore = ensureDb();
  const ref = doc(collection(firestore, "tenants", tenantId, "notifications"));

  await setDoc(ref, {
    ...payload,
    readBy: [],
    createdAt: serverTimestamp(),
  });
}

export async function markAsRead(tenantId: string, notificationId: string, userId: string) {
  const firestore = ensureDb();
  const ref = doc(firestore, "tenants", tenantId, "notifications", notificationId);
  await updateDoc(ref, { readBy: arrayUnion(userId) });
}

export function subscribeNotificationsRealtime(
  tenantId: string,
  callback: (items: AppNotification[]) => void,
): Unsubscribe {
  const firestore = ensureDb();
  const q = query(
    collection(firestore, "tenants", tenantId, "notifications"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((item) => ({ id: item.id, ...(item.data() as AppNotification) }));
    callback(items);
  });
}

export async function getUnreadCount(tenantId: string, userId: string, role: NotificationRole) {
  const firestore = ensureDb();
  const q = query(
    collection(firestore, "tenants", tenantId, "notifications"),
    where("targetRoles", "array-contains", role),
  );
  const snap = await getDocs(q);
  return snap.docs.filter((item) => {
    const data = item.data() as AppNotification;
    return !Array.isArray(data.readBy) || !data.readBy.includes(userId);
  }).length;
}
