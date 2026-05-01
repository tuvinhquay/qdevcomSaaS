"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  addGroupMember,
  createGroup,
  getChatsForUser,
  getFriends,
  getGroupsForUser,
  getOrCreateDirectChat,
  listenMessages,
  removeGroupMember,
  sendMessage,
  type ChatMessageV2,
  type ChatRoom,
} from "@/services/chat_service";
import {
  acceptRequest,
  blockUser,
  rejectRequest,
  sendFriendRequest,
  type FriendRequestStatus,
} from "@/services/friend_service";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { SupportedLanguage } from "@/services/translate_service";

type ChatTab = "personal" | "group";

type FriendItem = {
  id: string;
  name: string;
  personalId: string;
  role: string;
  avatarUrl?: string;
};

type FriendRequestItem = {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
};

type GroupItem = {
  id: string;
  groupName: string;
  groupAvatar?: string;
  memberIds: string[];
  admins: string[];
};

const LANG_OPTIONS: SupportedLanguage[] = ["vi", "en", "zh", "ja", "ko"];
const EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "🎯", "💡", "🚀"];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isManagerPlus(role: string | null): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export default function ChatPage() {
  const { user, loading, tenantId, currentUserRole } = useAuth();

  const [activeTab, setActiveTab] = useState<ChatTab>("personal");
  const [language, setLanguage] = useState<SupportedLanguage>("vi");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageV2[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [friendPersonalId, setFriendPersonalId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMemberInput, setGroupMemberInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const canUseChat =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "staff";

  const unreadCount = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const chat of chats) {
      const last = chat.lastMessage;
      if (!last || last.senderId === user.uid) {
        counts[chat.id] = 0;
        continue;
      }
      counts[chat.id] = 1;
    }
    return counts;
  }, [chats, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!tenantId || !user || !db) return;

    void (async () => {
      try {
        const [friendDocs, userChats, userGroups] = await Promise.all([
          getFriends(tenantId, user.uid),
          getChatsForUser(tenantId, user.uid),
          getGroupsForUser(tenantId, user.uid),
        ]);

        setFriends(
          friendDocs.map((item) => ({
            id: String(item.id),
            name: String(item.name ?? "Unknown"),
            personalId: String(item.personalId ?? ""),
            role: String(item.role ?? "staff"),
            avatarUrl: (item.avatarUrl as string | undefined) ?? undefined,
          })),
        );
        setChats(userChats);
        setGroups(
          userGroups.map((group) => ({
            id: String(group.id),
            groupName: String(group.groupName ?? "Group"),
            groupAvatar: (group.groupAvatar as string | undefined) ?? undefined,
            memberIds: (group.memberIds as string[] | undefined) ?? [],
            admins: (group.admins as string[] | undefined) ?? [],
          })),
        );

        const requestSnap = await getDocs(
          query(
            collection(db, "tenants", tenantId, "friend_requests"),
            where("status", "==", "pending"),
          ),
        );
        const rawRequests = requestSnap.docs.map(
          (docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) }) as Record<string, unknown>,
        );
        setFriendRequests(
          rawRequests
            .filter(
              (item) => item.senderId === user.uid || item.receiverId === user.uid,
            )
            .map((item) => ({
              id: String(item.id),
              senderId: String(item.senderId),
              receiverId: String(item.receiverId),
              status: item.status as FriendRequestStatus,
            })),
        );
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Tai du lieu chat that bai.");
      }
    })();
  }, [tenantId, user]);

  useEffect(() => {
    if (!tenantId || !currentChatId) {
      setMessages([]);
      return;
    }

    const unsub = listenMessages(
      tenantId,
      currentChatId,
      (nextMessages) => setMessages(nextMessages),
      (error) => setToast(error.message),
    );
    return () => unsub();
  }, [tenantId, currentChatId]);

  const handleOpenDirectChat = async (friendId: string) => {
    if (!tenantId || !user) return;
    try {
      const chatId = await getOrCreateDirectChat(tenantId, user.uid, friendId);
      setCurrentChatId(chatId);
      setActiveTab("personal");
      const latestChats = await getChatsForUser(tenantId, user.uid);
      setChats(latestChats);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Khong mo duoc chat 1-1.");
    }
  };

  const handleCreateGroup = async () => {
    if (!tenantId || !user) return;
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setToast("Hay nhap ten nhom.");
      return;
    }
    try {
      const memberIds = groupMemberInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const chatId = await createGroup({
        tenantId,
        groupName: trimmedName,
        createdBy: user.uid,
        memberIds,
      });
      setGroupName("");
      setGroupMemberInput("");
      setCurrentChatId(chatId);
      setActiveTab("group");

      const [latestGroups, latestChats] = await Promise.all([
        getGroupsForUser(tenantId, user.uid),
        getChatsForUser(tenantId, user.uid),
      ]);
      setGroups(
        latestGroups.map((group) => ({
          id: String(group.id),
          groupName: String(group.groupName ?? "Group"),
          groupAvatar: (group.groupAvatar as string | undefined) ?? undefined,
          memberIds: (group.memberIds as string[] | undefined) ?? [],
          admins: (group.admins as string[] | undefined) ?? [],
        })),
      );
      setChats(latestChats);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Tao nhom that bai.");
    }
  };

  const handleSend = async () => {
    if (!tenantId || !currentChatId || !user) return;
    const text = inputValue.trim();
    if (!text) return;
    try {
      setSending(true);
      await sendMessage({
        tenantId,
        chatId: currentChatId,
        senderId: user.uid,
        senderName: user.displayName || user.email || "User",
        senderAvatar: user.photoURL ?? undefined,
        text,
        type: "text",
        replyTo,
      });
      setInputValue("");
      setReplyTo(null);
      const latestChats = await getChatsForUser(tenantId, user.uid);
      setChats(latestChats);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Gui tin nhan that bai.");
    } finally {
      setSending(false);
    }
  };

  const handleAddFriend = async () => {
    if (!tenantId || !user || !db) return;
    const personalId = friendPersonalId.trim();
    if (!personalId) return;
    try {
      const memberSnap = await getDocs(
        query(collection(db, "companies", tenantId, "members"), where("personalId", "==", personalId)),
      );
      if (memberSnap.empty) {
        setToast("Khong tim thay Personal ID.");
        return;
      }
      const receiverId = memberSnap.docs[0].id;
      await sendFriendRequest(tenantId, user.uid, receiverId);
      setFriendPersonalId("");
      setToast("Da gui loi moi ket ban.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Gui loi moi that bai.");
    }
  };

  const handleFriendRequestAction = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    if (!tenantId) return;
    try {
      if (action === "accept") {
        await acceptRequest(tenantId, requestId);
      } else {
        await rejectRequest(tenantId, requestId);
      }
      setFriendRequests((prev) => prev.filter((item) => item.id !== requestId));
      setToast(action === "accept" ? "Da chap nhan loi moi." : "Da tu choi loi moi.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Xu ly loi moi that bai.");
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputValue((prev) => `${prev}${emoji}`);
  };

  const handleVoicePlaceholder = () => {
    setInputValue((prev) => `${prev}${prev ? " " : ""}[voice:${Date.now()}]`);
  };

  const handleMention = () => {
    setInputValue((prev) => `${prev}${prev ? " " : ""}@q `);
  };

  const currentChat = chats.find((item) => item.id === currentChatId) ?? null;
  const currentGroup = currentChat?.groupId
    ? groups.find((group) => group.id === currentChat.groupId) ?? null
    : null;

  const canManageCurrentGroup = Boolean(
    user &&
      currentGroup &&
      (isManagerPlus(currentUserRole) || currentGroup.admins.includes(user.uid)),
  );

  if (loading || !tenantId) {
    return <p className="text-sm text-slate-300">Dang tai module chat nang cao...</p>;
  }

  if (!canUseChat) {
    return <p className="text-sm font-semibold text-rose-200">Ban khong co quyen truy cap chat.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat Module Nang Cao</h1>
          <p className="mt-1 text-sm text-slate-300">
            1-1, nhom noi bo, @q AI, da ngon ngu, emoji va realtime lich su.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">Language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          >
            {LANG_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-white/15 bg-slate-950/35 p-3 backdrop-blur-md">
          <div className="flex rounded-lg border border-white/15 bg-slate-900/55 p-1">
            <button
              onClick={() => setActiveTab("personal")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                activeTab === "personal" ? "bg-emerald-500/20 text-emerald-100" : "text-slate-200",
              ].join(" ")}
            >
              Tin nhan 1-1
            </button>
            <button
              onClick={() => setActiveTab("group")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                activeTab === "group" ? "bg-emerald-500/20 text-emerald-100" : "text-slate-200",
              ].join(" ")}
            >
              Nhom
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
              Ket ban bang Personal ID
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={friendPersonalId}
                onChange={(event) => setFriendPersonalId(event.target.value)}
                placeholder="Nhap Personal ID"
                className="flex-1 rounded-md border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              />
              <button
                onClick={() => void handleAddFriend()}
                className="rounded-md border border-cyan-200/40 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100"
              >
                Add
              </button>
            </div>
          </div>

          {friendRequests.length > 0 ? (
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                Friend Requests
              </p>
              <div className="mt-2 space-y-2">
                {friendRequests.map((request) => {
                  const isReceiver = request.receiverId === user?.uid;
                  return (
                    <div key={request.id} className="rounded-md border border-white/10 bg-slate-950/40 p-2">
                      <p className="text-xs text-slate-200">
                        {isReceiver ? `Tu: ${request.senderId}` : `Da gui: ${request.receiverId}`}
                      </p>
                      {isReceiver ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void handleFriendRequestAction(request.id, "accept")}
                            className="rounded border border-emerald-300/40 px-2 py-1 text-xs text-emerald-100"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => void handleFriendRequestAction(request.id, "reject")}
                            className="rounded border border-rose-300/40 px-2 py-1 text-xs text-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "personal" ? (
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Friends</p>
              <div className="mt-2 space-y-2">
                {friends.length === 0 ? (
                  <p className="text-sm text-slate-300">Chua co ban be.</p>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-slate-950/40 p-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-100">{friend.name}</p>
                        <p className="text-xs text-slate-300">{friend.personalId}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleOpenDirectChat(friend.id)}
                          className="rounded border border-cyan-200/40 px-2 py-1 text-xs text-cyan-100"
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => void blockUser(tenantId, user!.uid, friend.id)}
                          className="rounded border border-rose-300/40 px-2 py-1 text-xs text-rose-100"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Tao nhom</p>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Ten nhom"
                  className="mt-2 w-full rounded-md border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={groupMemberInput}
                  onChange={(event) => setGroupMemberInput(event.target.value)}
                  placeholder="Member IDs (comma-separated)"
                  className="mt-2 w-full rounded-md border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                />
                <button
                  onClick={() => void handleCreateGroup()}
                  className="mt-2 w-full rounded-md border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100"
                >
                  Tao group
                </button>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                  Danh sach nhom
                </p>
                <div className="mt-2 space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-sm text-slate-300">Chua co nhom.</p>
                  ) : (
                    groups.map((group) => {
                      const groupChat = chats.find((chat) => chat.groupId === group.id);
                      return (
                        <button
                          key={group.id}
                          onClick={() => setCurrentChatId(groupChat?.id ?? null)}
                          className="block w-full rounded-md border border-white/10 bg-slate-950/45 px-3 py-2 text-left text-sm text-slate-100"
                        >
                          {group.groupName}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>

        <section className="rounded-xl border border-white/15 bg-slate-950/35 backdrop-blur-md">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {currentChat
                    ? currentChat.type === "group"
                      ? `Group: ${currentGroup?.groupName ?? currentChat.groupId}`
                      : "Chat 1-1"
                    : "Chon mot cuoc tro chuyen"}
                </h2>
                {currentChat ? (
                  <p className="text-xs text-slate-300">Unread: {unreadCount[currentChat.id] ?? 0}</p>
                ) : null}
              </div>
              {currentGroup && canManageCurrentGroup ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const target = window.prompt("Nhap userId can them vao nhom");
                      if (!target || !tenantId) return;
                      void addGroupMember(tenantId, currentGroup.id, target).then(() =>
                        setToast("Da them thanh vien."),
                      );
                    }}
                    className="rounded border border-cyan-200/40 px-2 py-1 text-xs text-cyan-100"
                  >
                    Add member
                  </button>
                  <button
                    onClick={() => {
                      const target = window.prompt("Nhap userId can xoa khoi nhom");
                      if (!target || !tenantId) return;
                      void removeGroupMember(tenantId, currentGroup.id, target).then(() =>
                        setToast("Da xoa thanh vien."),
                      );
                    }}
                    className="rounded border border-rose-300/40 px-2 py-1 text-xs text-rose-100"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="h-[58vh] overflow-y-auto px-4 py-4">
            {!currentChatId ? (
              <p className="text-sm text-slate-300">Hay chon friend hoac group de bat dau chat.</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-300">Chua co tin nhan.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const own = message.senderId === user?.uid;
                  const displayText = message.translations[language] || message.text;
                  const isMentioned = displayText.includes("@q");
                  const replyTarget = message.replyTo
                    ? messages.find((item) => item.id === message.replyTo)
                    : null;

                  return (
                    <div key={message.id} className={["flex gap-2", own ? "justify-end" : "justify-start"].join(" ")}>
                      {!own ? (
                        <div className="h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-slate-800 text-[10px] text-slate-200 flex items-center justify-center">
                          {message.senderAvatar ? (
                            <img src={message.senderAvatar} alt={message.senderName} className="h-full w-full object-cover" />
                          ) : (
                            <span>{message.senderName.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                      ) : null}

                      <div
                        className={[
                          "max-w-[76%] rounded-xl border px-3 py-2",
                          own
                            ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-50"
                            : "border-white/20 bg-slate-900/55 text-slate-100",
                        ].join(" ")}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold">{message.senderName}</span>
                          <span className="opacity-75">{formatTime(message.createdAt)}</span>
                        </div>

                        {replyTarget ? (
                          <div className="mb-2 rounded border border-white/15 bg-slate-800/35 px-2 py-1 text-xs text-slate-200">
                            Reply: {(replyTarget.translations[language] || replyTarget.text).slice(0, 90)}
                          </div>
                        ) : null}

                        <p
                          className={[
                            "whitespace-pre-wrap text-sm leading-6",
                            isMentioned ? "font-medium text-cyan-100" : "",
                          ].join(" ")}
                        >
                          {displayText}
                        </p>

                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => setReplyTo(message.id)}
                            className="rounded border border-white/20 px-2 py-0.5 text-[11px]"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            {replyTo ? (
              <div className="mb-2 flex items-center justify-between rounded-md border border-cyan-200/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-50">
                <span>Dang reply message: {replyTo.slice(0, 12)}...</span>
                <button onClick={() => setReplyTo(null)} className="underline">
                  Bo reply
                </button>
              </div>
            ) : null}

            <div className="mb-2 flex flex-wrap gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddEmoji(emoji)}
                  className="rounded border border-white/15 bg-slate-900/60 px-2 py-1 text-sm"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={handleMention}
                className="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100"
              >
                @q
              </button>
              <button
                onClick={handleVoicePlaceholder}
                className="rounded border border-white/20 bg-slate-900/60 px-2 py-1 text-xs text-slate-100"
              >
                Voice
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Nhap tin nhan... (@q de goi tro ly AI)"
                className="flex-1 rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
              />
              <button
                onClick={() => void handleSend()}
                disabled={sending || !currentChatId}
                className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-white/20 bg-slate-900/95 px-4 py-2 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
