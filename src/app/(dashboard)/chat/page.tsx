"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  deleteMessage,
  sendMessage,
  subscribeMessages,
} from "@/core/firestore/chatRepo";
import { type ChatMessage } from "@/types/chat";

const CHANNEL_OPTIONS = ["all", "general", "production", "warehouse", "ops"] as const;
type ChannelOption = (typeof CHANNEL_OPTIONS)[number];

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { user, loading, currentCompanyId, currentUserRole } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelOption>("general");
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const canReadAndSend =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "staff";

  const isManagerPlus =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager";

  const effectiveChannel = selectedChannel === "all" ? undefined : selectedChannel;

  const groupedMessages = useMemo(() => {
    return messages;
  }, [messages]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupedMessages]);

  useEffect(() => {
    if (!currentCompanyId || !canReadAndSend) {
      return;
    }

    const unsubscribe = subscribeMessages(
      (nextMessages) => {
        setMessages(nextMessages);
      },
      (error) => {
        setToast(error.message || "Failed to listen chat messages.");
      },
      effectiveChannel,
    );

    return () => unsubscribe();
  }, [currentCompanyId, canReadAndSend, effectiveChannel]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !user) {
      return;
    }

    try {
      setIsSending(true);
      await sendMessage({
        id: "",
        companyId: currentCompanyId ?? "",
        senderId: user.uid,
        senderName: user.displayName || user.email || "User",
        senderAvatar: user.photoURL || undefined,
        content,
        createdAt: Date.now(),
        channel: effectiveChannel,
      });
      setInputValue("");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Send failed.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (message: ChatMessage) => {
    if (!user) return;

    const isCreator = message.senderId === user.uid;
    if (!isCreator && !isManagerPlus) {
      setToast("Permission denied");
      return;
    }

    if (!window.confirm("Delete this message?")) {
      return;
    }

    try {
      await deleteMessage(message.id);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  if (loading || !currentCompanyId) {
    return <p className="text-sm text-slate-300">Loading chat module...</p>;
  }

  if (!canReadAndSend) {
    return <p className="text-sm font-semibold text-rose-200">Access denied</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Internal Chat</h1>
          <p className="mt-1 text-sm text-slate-300">Realtime tenant chat for your team.</p>
        </div>

        <select
          value={selectedChannel}
          onChange={(event) => setSelectedChannel(event.target.value as ChannelOption)}
          className="rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          {CHANNEL_OPTIONS.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/15 bg-slate-950/35 backdrop-blur-md">
        <div className="h-[58vh] overflow-y-auto px-4 py-4">
          {groupedMessages.length === 0 ? (
            <p className="text-sm text-slate-300">No messages yet. Start the conversation.</p>
          ) : (
            <div className="space-y-3">
              {groupedMessages.map((message) => {
                const isOwn = message.senderId === user?.uid;
                return (
                  <div
                    key={message.id}
                    className={[
                      "flex gap-2",
                      isOwn ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    {!isOwn && (
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/20 bg-slate-800 text-[10px] text-slate-200 flex items-center justify-center">
                        {message.senderAvatar ? (
                          <img src={message.senderAvatar} alt={message.senderName} className="h-full w-full object-cover" />
                        ) : (
                          <span>{message.senderName.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                    )}

                    <div
                      className={[
                        "max-w-[70%] rounded-lg border px-3 py-2",
                        isOwn
                          ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-50"
                          : "border-white/20 bg-slate-900/55 text-slate-100",
                      ].join(" ")}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold">{message.senderName}</span>
                        <span className="opacity-75">{formatTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      {message.channel && (
                        <div className="mt-1 text-[11px] opacity-80">#{message.channel}</div>
                      )}
                      {(isOwn || isManagerPlus) && (
                        <div className="mt-2 text-right">
                          <button
                            onClick={() => void handleDelete(message)}
                            className="rounded border border-rose-300/40 px-2 py-0.5 text-[11px] text-rose-100 hover:bg-rose-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
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
              placeholder="Type a message..."
              className="flex-1 rounded-md border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <button
              onClick={() => void handleSend()}
              disabled={isSending}
              className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-white/20 bg-slate-900/95 px-4 py-2 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
