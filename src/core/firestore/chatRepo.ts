"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import {
  getAuthenticatedUid,
  getCurrentCompanyId,
  getCurrentUserRole,
  type UserRole,
} from "@/core/firestore/firestoreClient";
import { type ChatMessage } from "@/types/chat";

const READ_SEND_ROLES: UserRole[] = ["owner", "admin", "manager", "staff"];
const MANAGER_PLUS_ROLES: UserRole[] = ["owner", "admin", "manager"];

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

function assertRoleAllowed(role: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }
}

async function getContextOrThrow() {
  const companyId = await getCurrentCompanyId();
  const role = await getCurrentUserRole(companyId ?? undefined);
  const uid = getAuthenticatedUid();

  if (!companyId || !role || !uid) {
    throw new Error("Permission denied");
  }

  return { companyId, role, uid };
}

function mapDocToMessage(
  companyId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  return {
    id,
    companyId,
    senderId: (data.senderId as string) ?? "",
    senderName: (data.senderName as string) ?? "Unknown",
    senderAvatar: (data.senderAvatar as string | undefined) ?? undefined,
    content: (data.content as string) ?? "",
    createdAt: Number(data.createdAt ?? Date.now()),
    updatedAt: (data.updatedAt as number | undefined) ?? undefined,
    channel: (data.channel as string | undefined) ?? undefined,
  };
}

export async function getMessages(channel?: string): Promise<ChatMessage[]> {
  assertFirestoreReady();
  const { companyId, role } = await getContextOrThrow();
  assertRoleAllowed(role, READ_SEND_ROLES);

  const baseRef = collection(db!, "companies", companyId, "chat");
  const chatQuery = channel
    ? query(baseRef, where("channel", "==", channel), orderBy("createdAt", "asc"))
    : query(baseRef, orderBy("createdAt", "asc"));

  const snap = await getDocs(chatQuery);
  return snap.docs.map((item) =>
    mapDocToMessage(companyId, item.id, item.data() as Record<string, unknown>),
  );
}

export function subscribeMessages(
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
  channel?: string,
): Unsubscribe {
  if (!db) {
    onError(new Error("Firestore is not initialized. Check Firebase env variables."));
    return () => {};
  }

  let unsub: Unsubscribe = () => {};

  void (async () => {
    try {
      const { companyId, role } = await getContextOrThrow();
      assertRoleAllowed(role, READ_SEND_ROLES);

      const baseRef = collection(db!, "companies", companyId, "chat");
      const chatQuery = channel
        ? query(baseRef, where("channel", "==", channel), orderBy("createdAt", "asc"))
        : query(baseRef, orderBy("createdAt", "asc"));

      unsub = onSnapshot(
        chatQuery,
        (snap) => {
          const messages = snap.docs.map((item) =>
            mapDocToMessage(companyId, item.id, item.data() as Record<string, unknown>),
          );
          onData(messages);
        },
        (error) => {
          onError(error instanceof Error ? error : new Error("Failed to listen chat messages."));
        },
      );
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Failed to listen chat messages."));
    }
  })();

  return () => unsub();
}

export async function sendMessage(data: ChatMessage): Promise<string> {
  assertFirestoreReady();
  const { companyId, role, uid } = await getContextOrThrow();
  assertRoleAllowed(role, READ_SEND_ROLES);

  const content = data.content?.trim();
  if (!content) {
    throw new Error("Message content is required.");
  }

  const now = Date.now();
  const collectionRef = collection(db!, "companies", companyId, "chat");
  const created = await addDoc(collectionRef, {
    companyId,
    senderId: uid,
    senderName: data.senderName || auth?.currentUser?.displayName || "User",
    senderAvatar: data.senderAvatar || null,
    content,
    createdAt: now,
    updatedAt: now,
    channel: data.channel?.trim() || null,
  });

  return created.id;
}

export async function updateMessage(
  id: string,
  data: Partial<Pick<ChatMessage, "content" | "channel">>,
): Promise<void> {
  assertFirestoreReady();
  const { companyId, role, uid } = await getContextOrThrow();

  const messageRef = doc(db!, "companies", companyId, "chat", id);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found.");
  }

  const messageData = messageSnap.data();
  const isCreator = (messageData.senderId as string | undefined) === uid;
  const isManagerPlus = MANAGER_PLUS_ROLES.includes(role);

  if (!isCreator && !isManagerPlus) {
    throw new Error("Permission denied");
  }

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (typeof data.content === "string") {
    const content = data.content.trim();
    if (!content) {
      throw new Error("Message content is required.");
    }
    payload.content = content;
  }

  if (Object.prototype.hasOwnProperty.call(data, "channel")) {
    payload.channel = data.channel?.trim() || null;
  }

  await updateDoc(messageRef, payload);
}

export async function deleteMessage(id: string): Promise<void> {
  assertFirestoreReady();
  const { companyId, role, uid } = await getContextOrThrow();

  const messageRef = doc(db!, "companies", companyId, "chat", id);
  const messageSnap = await getDoc(messageRef);

  if (!messageSnap.exists()) {
    throw new Error("Message not found.");
  }

  const messageData = messageSnap.data();
  const isCreator = (messageData.senderId as string | undefined) === uid;
  const isManagerPlus = MANAGER_PLUS_ROLES.includes(role);

  if (!isCreator && !isManagerPlus) {
    throw new Error("Permission denied");
  }

  await deleteDoc(messageRef);
}
