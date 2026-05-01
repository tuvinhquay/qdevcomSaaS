import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { buildTranslations, type SupportedLanguage } from "@/services/translate_service";
import { handleAIMessage } from "@/services/ai_service";

export type ChatType = "personal" | "group";
export type MessageType = "text" | "voice";

export type ChatRoom = {
  id: string;
  type: ChatType;
  participants: string[];
  groupId?: string;
  createdAt?: number;
  updatedAt?: number;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
  };
};

type GenericDoc = { id: string } & Record<string, unknown>;

export type ChatMessageV2 = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  text: string;
  audioUrl?: string;
  duration?: number;
  replyTo: string | null;
  translations: Record<SupportedLanguage, string>;
  createdAt: number;
};

type SendMessageInput = {
  tenantId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type?: MessageType;
  replyTo?: string | null;
  audioUrl?: string;
  duration?: number;
};

const EMOJI_FALLBACK = "🙂";

function assertDb() {
  if (!db) throw new Error("Firestore is not initialized.");
}

function mapTimestamp(input: unknown): number {
  if (!input) return Date.now();
  if (typeof input === "number") return input;
  const maybeSeconds = input as { seconds?: number };
  if (typeof maybeSeconds.seconds === "number") return maybeSeconds.seconds * 1000;
  return Date.now();
}

function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function normalizePair(a: string, b: string): string[] {
  return [a, b].sort((x, y) => x.localeCompare(y));
}

async function getOrCreatePersonalChat(
  tenantId: string,
  userA: string,
  userB: string,
): Promise<string> {
  assertDb();
  const participants = normalizePair(userA, userB);
  const chatQuery = query(
    collection(db!, "tenants", tenantId, "chats"),
    where("type", "==", "personal"),
    where("participants", "==", participants),
    limit(1),
  );
  const existing = await getDocs(chatQuery);
  if (!existing.empty) return existing.docs[0].id;

  const created = await addDoc(collection(db!, "tenants", tenantId, "chats"), {
    type: "personal",
    participants,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unreadBy: [],
    lastMessage: null,
  });
  return created.id;
}

function detectAITrigger(text: string): boolean {
  return text.trim().toLowerCase().startsWith("@q");
}

async function appendAIReply(
  tenantId: string,
  chatId: string,
  sourceMessage: SendMessageInput,
): Promise<void> {
  const aiText = await handleAIMessage(sourceMessage.text);
  const aiTranslations = await buildTranslations(aiText);
  const aiCreatedAt = Date.now();

  await addDoc(collection(db!, "tenants", tenantId, "chats", chatId, "messages"), {
    senderId: "q-assistant",
    senderName: "Q Assistant",
    senderAvatar: "/assets/images/appqdev.png",
    type: "text",
    text: aiText,
    audioUrl: null,
    duration: null,
    replyTo: null,
    translations: aiTranslations,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db!, "tenants", tenantId, "chats", chatId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      text: aiText,
      senderId: "q-assistant",
      createdAt: aiCreatedAt,
    },
  });
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  assertDb();
  const cleanText = sanitizeText(input.text || EMOJI_FALLBACK);
  if (!cleanText) throw new Error("Message is empty.");

  const translations = await buildTranslations(cleanText);
  const createdAt = Date.now();

  await addDoc(collection(db!, "tenants", input.tenantId, "chats", input.chatId, "messages"), {
    senderId: input.senderId,
    senderName: input.senderName,
    senderAvatar: input.senderAvatar ?? null,
    type: input.type ?? "text",
    text: cleanText,
    audioUrl: input.audioUrl ?? null,
    duration: input.duration ?? null,
    replyTo: input.replyTo ?? null,
    translations,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db!, "tenants", input.tenantId, "chats", input.chatId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      text: cleanText,
      senderId: input.senderId,
      createdAt,
    },
  });

  if (detectAITrigger(cleanText)) {
    await appendAIReply(input.tenantId, input.chatId, { ...input, text: cleanText });
  }
}

export function listenMessages(
  tenantId: string,
  chatId: string,
  onData: (messages: ChatMessageV2[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  assertDb();
  const q = query(
    collection(db!, "tenants", tenantId, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((item) => {
        const data = item.data() as Record<string, unknown>;
        return {
          id: item.id,
          senderId: String(data.senderId ?? ""),
          senderName: String(data.senderName ?? "Unknown"),
          senderAvatar: (data.senderAvatar as string | null) ?? undefined,
          type: (data.type as MessageType | undefined) ?? "text",
          text: String(data.text ?? ""),
          audioUrl: (data.audioUrl as string | null) ?? undefined,
          duration: (data.duration as number | null) ?? undefined,
          replyTo: (data.replyTo as string | null) ?? null,
          translations:
            (data.translations as Record<SupportedLanguage, string> | undefined) ??
            ({ vi: "", en: "", zh: "", ja: "", ko: "" } as Record<SupportedLanguage, string>),
          createdAt: mapTimestamp(data.createdAt),
        } satisfies ChatMessageV2;
      });
      onData(messages);
    },
    (error) => onError(error instanceof Error ? error : new Error("listenMessages failed")),
  );
}

export async function createGroup(groupData: {
  tenantId: string;
  groupName: string;
  groupAvatar?: string;
  createdBy: string;
  memberIds: string[];
}): Promise<string> {
  assertDb();
  const uniqueMembers = Array.from(new Set([groupData.createdBy, ...groupData.memberIds]));
  const groupRef = await addDoc(collection(db!, "tenants", groupData.tenantId, "groups"), {
    groupName: groupData.groupName.trim(),
    groupAvatar: groupData.groupAvatar ?? null,
    createdBy: groupData.createdBy,
    memberIds: uniqueMembers,
    admins: [groupData.createdBy],
    createdAt: serverTimestamp(),
  });

  const chatRef = await addDoc(collection(db!, "tenants", groupData.tenantId, "chats"), {
    type: "group",
    participants: uniqueMembers,
    groupId: groupRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unreadBy: [],
    lastMessage: null,
  });

  return chatRef.id;
}

export async function addGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  const groupRef = doc(db!, "tenants", tenantId, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Group not found.");
  const data = groupSnap.data() as { memberIds?: string[] };
  const nextMembers = Array.from(new Set([...(data.memberIds ?? []), userId]));
  await updateDoc(groupRef, { memberIds: nextMembers });

  const chatQuery = query(
    collection(db!, "tenants", tenantId, "chats"),
    where("groupId", "==", groupId),
    limit(1),
  );
  const chatSnap = await getDocs(chatQuery);
  if (!chatSnap.empty) {
    await updateDoc(chatSnap.docs[0].ref, { participants: nextMembers, updatedAt: serverTimestamp() });
  }
}

export async function removeGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  assertDb();
  const groupRef = doc(db!, "tenants", tenantId, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Group not found.");
  const data = groupSnap.data() as { memberIds?: string[]; admins?: string[] };
  const nextMembers = (data.memberIds ?? []).filter((id) => id !== userId);
  const nextAdmins = (data.admins ?? []).filter((id) => id !== userId);
  await updateDoc(groupRef, { memberIds: nextMembers, admins: nextAdmins });

  const chatQuery = query(
    collection(db!, "tenants", tenantId, "chats"),
    where("groupId", "==", groupId),
    limit(1),
  );
  const chatSnap = await getDocs(chatQuery);
  if (!chatSnap.empty) {
    await updateDoc(chatSnap.docs[0].ref, { participants: nextMembers, updatedAt: serverTimestamp() });
  }
}

export async function getChatsForUser(tenantId: string, userId: string): Promise<ChatRoom[]> {
  assertDb();
  const snap = await getDocs(collection(db!, "tenants", tenantId, "chats"));
  const raw = snap.docs.map(
    (item) => ({ id: item.id, ...(item.data() as Record<string, unknown>) }) as Record<string, unknown>,
  );
  return raw
    .filter((item) => Array.isArray(item.participants) && item.participants.includes(userId))
    .map((item) => ({
      id: String(item.id),
      type: (item.type as ChatType | undefined) ?? "personal",
      participants: (item.participants as string[] | undefined) ?? [],
      groupId: (item.groupId as string | undefined) ?? undefined,
      createdAt: mapTimestamp(item.createdAt),
      updatedAt: mapTimestamp(item.updatedAt),
      lastMessage: item.lastMessage as ChatRoom["lastMessage"],
    }));
}

export async function getGroupsForUser(tenantId: string, userId: string): Promise<GenericDoc[]> {
  assertDb();
  const snap = await getDocs(collection(db!, "tenants", tenantId, "groups"));
  return snap.docs
    .map(
      (item) => ({ id: item.id, ...(item.data() as Record<string, unknown>) }) as GenericDoc,
    )
    .filter((item) => Array.isArray(item.memberIds) && item.memberIds.includes(userId));
}

export async function getFriends(tenantId: string, userId: string): Promise<GenericDoc[]> {
  assertDb();
  const meSnap = await getDoc(doc(db!, "companies", tenantId, "members", userId));
  if (!meSnap.exists()) return [] as GenericDoc[];
  const friendIds = ((meSnap.data() as { friendIds?: string[] }).friendIds ?? []).filter(Boolean);
  if (friendIds.length === 0) return [] as GenericDoc[];

  const allMembers = await getDocs(collection(db!, "companies", tenantId, "members"));
  return allMembers.docs
    .map((item) => ({ id: item.id, ...(item.data() as Record<string, unknown>) }))
    .filter((item) => friendIds.includes(String(item.id)));
}

export async function sendFriendRequest(
  tenantId: string,
  senderId: string,
  receiverId: string,
): Promise<void> {
  assertDb();
  if (senderId === receiverId) throw new Error("Khong the gui loi moi cho chinh minh.");
  await addDoc(collection(db!, "tenants", tenantId, "friend_requests"), {
    senderId,
    receiverId,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function getOrCreateDirectChat(
  tenantId: string,
  meUserId: string,
  targetUserId: string,
): Promise<string> {
  return getOrCreatePersonalChat(tenantId, meUserId, targetUserId);
}
