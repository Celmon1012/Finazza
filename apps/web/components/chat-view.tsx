"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Hash,
  ImagePlus,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  Pencil,
  Play,
  Search,
  Send,
  ShieldCheck,
  SquarePen,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { cachedMessages, fetchMessages, prefetchMessages, rememberMessages } from "@/lib/chat-cache";
import { getSocket, useAuth } from "@/lib/auth";
import type { ChatMessage, Conversation, PublicUser } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { ReportButton } from "./report-button";
import { Avatar, Button, inputClass, Modal, Spinner } from "./ui";

const THREAD_POLL_MS = 3000;
const LIST_POLL_MS = 10000;
const GROUP_GAP_MS = 5 * 60 * 1000;
const MAX_VOICE_MS = 3 * 60 * 1000;
const MIN_VOICE_MS = 700;
const VOICE_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function isPending(message: ChatMessage) {
  return message.id.startsWith("pending-");
}

function titleOf(convo: Conversation) {
  return convo.type === "topic" ? `#${convo.slug}` : convo.name;
}

function otherMember(convo: Conversation, viewerId?: string) {
  return convo.members.find((member) => member.id !== viewerId) || null;
}

function sameDay(left: string, right: string) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function joinsPrevious(message: ChatMessage, previous?: ChatMessage) {
  if (!previous || previous.author?.id !== message.author?.id) return false;
  if (!sameDay(previous.createdAt, message.createdAt)) return false;
  return new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_GAP_MS;
}

export function ChatView() {
  const { user, refreshBadges } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const routeId = pathname.startsWith("/chat/") ? decodeURIComponent(pathname.slice("/chat/".length).split("/")[0] || "") : "";
  const [chosenId, setChosenId] = useState<string | null>(null);
  const activeId = chosenId ?? routeId;
  const [scope, setScope] = useState<"topic" | "inbox">("inbox");
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => (activeId && cachedMessages(activeId)) || []);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [composerMode, setComposerMode] = useState<"dm" | "group" | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [messagesReady, setMessagesReady] = useState(() => Boolean(activeId && cachedMessages(activeId)));
  const [canRecord, setCanRecord] = useState(false);
  const [recordingSince, setRecordingSince] = useState<number | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const discardRecording = useRef(false);
  const bottom = useRef<HTMLDivElement | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const readyRef = useRef(false);
  messagesRef.current = messages;
  readyRef.current = messagesReady;

  const active = useMemo(() => [...rooms, ...inbox].find((item) => item.id === activeId) || null, [rooms, inbox, activeId]);

  useEffect(() => {
    if (chosenId !== null && routeId === chosenId) setChosenId(null);
  }, [routeId, chosenId]);

  function showConversation(id: string) {
    setChosenId(id);
    prefetchMessages(id);
    if (id === routeId) return;
    const href = id ? `/chat/${id}` : "/chat";
    window.setTimeout(() => router.push(href), 0);
  }

  async function loadLists() {
    const [topic, direct] = await Promise.all([
      api<{ conversations: Conversation[] }>("/api/conversations?scope=topic"),
      api<{ conversations: Conversation[] }>("/api/conversations?scope=inbox"),
    ]);
    setRooms(topic.conversations);
    setInbox(direct.conversations);
    for (const item of [...topic.conversations, ...direct.conversations].slice(0, 12)) prefetchMessages(item.id);
  }

  function markRead(id: string) {
    api(`/api/conversations/${id}/read`, { method: "POST" })
      .then(() => refreshBadges())
      .catch(() => undefined);
  }

  /** Adds messages from the server, skipping ones already shown. Returns how many came from other people. */
  function takeIncoming(incoming: ChatMessage[]) {
    const current = messagesRef.current;
    const known = new Set(current.map((item) => item.id));
    const sending = current.some(isPending);
    const fresh = incoming.filter((item) => !known.has(item.id) && !(sending && item.author?.id === user?.id));
    if (!fresh.length) return 0;
    setMessages((latest) => {
      const ids = new Set(latest.map((item) => item.id));
      const add = fresh.filter((item) => !ids.has(item.id));
      if (!add.length) return latest;
      return [...latest.filter((item) => !isPending(item)), ...add, ...latest.filter(isPending)];
    });
    return fresh.filter((item) => item.author?.id !== user?.id).length;
  }

  useEffect(() => {
    loadLists()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load chats"))
      .finally(() => setLoading(false));
    let busy = false;
    const timer = window.setInterval(() => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      loadLists()
        .catch(() => undefined)
        .finally(() => {
          busy = false;
        });
    }, LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (active) setScope(active.type === "topic" ? "topic" : "inbox");
  }, [active?.id]);

  useEffect(() => {
    setMembersOpen(false);
    if (!activeId) {
      setMessages([]);
      setMessagesReady(false);
      return;
    }
    const cached = cachedMessages(activeId);
    if (cached) {
      setMessages(cached);
      setMessagesReady(true);
    } else {
      setMessages([]);
      setMessagesReady(false);
    }
    let cancelled = false;
    fetchMessages(activeId)
      .then((items) => {
        if (cancelled) return;
        // Keep in-flight optimistic sends; a slow first fetch must not wipe them.
        setMessages((current) => {
          const pending = current.filter(isPending);
          if (!pending.length) return items;
          const seen = new Set(items.map((item) => item.id));
          return [...items, ...pending.filter((item) => !seen.has(item.id))];
        });
        setMessagesReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open the chat");
      });
    markRead(activeId);

    let polling = false;
    const poll = async () => {
      if (polling || cancelled || !readyRef.current || document.visibilityState !== "visible") return;
      polling = true;
      try {
        const confirmed = messagesRef.current.filter((item) => !isPending(item));
        const last = confirmed[confirmed.length - 1]?.createdAt;
        const path = last
          ? `/api/conversations/${activeId}/messages?after=${encodeURIComponent(last)}`
          : `/api/conversations/${activeId}/messages`;
        const data = await api<{ messages: ChatMessage[] }>(path);
        if (cancelled) return;
        if (takeIncoming(data.messages) > 0) {
          markRead(activeId);
          loadLists().catch(() => undefined);
        }
      } finally {
        polling = false;
      }
    };
    const timer = window.setInterval(() => poll().catch(() => undefined), THREAD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);

    const socket = getSocket();
    socket?.emit("conversation:join", activeId);
    const onMessage = (message: ChatMessage) => {
      if (message.conversationId !== activeId) return;
      if (takeIncoming([message]) > 0) markRead(activeId);
    };
    socket?.on("message:new", onMessage);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      socket?.emit("conversation:leave", activeId);
      socket?.off("message:new", onMessage);
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !messagesReady || messages.length === 0) return;
    if (messages.some((item) => item.conversationId !== activeId)) return;
    rememberMessages(activeId, messages);
  }, [activeId, messages, messagesReady]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  useEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
  }, [text]);

  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  useEffect(() => {
    if (recordingSince == null) return;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - recordingSince;
      setRecordingMs(elapsed);
      if (elapsed >= MAX_VOICE_MS) stopRecording(false);
    }, 200);
    return () => window.clearInterval(timer);
  }, [recordingSince]);

  useEffect(() => () => stopRecording(true), [activeId]);

  async function send(imageUrl?: string) {
    if (!activeId || (!text.trim() && !imageUrl)) return;
    const body = { text, imageUrl: imageUrl || null };
    const pendingId = `pending-${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      conversationId: activeId,
      text: body.text.trim(),
      imageUrl: body.imageUrl,
      audioUrl: null,
      deleted: false,
      createdAt: new Date().toISOString(),
      author: user
        ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
        : null,
    };
    setText("");
    setError("");
    setMessages((current) => [...current, pending]);
    try {
      const result = await api<{ message: ChatMessage }>(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessages((current) => {
        const withoutDup = current.filter((item) => item.id !== result.message.id && item.id !== pendingId);
        return [...withoutDup, result.message];
      });
      loadLists().catch(() => undefined);
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      setText((current) => current || body.text);
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  async function removeEmpty(id: string) {
    await api(`/api/conversations/${id}`, { method: "DELETE" });
    setInbox((current) => current.filter((item) => item.id !== id));
    if (activeId === id) showConversation("");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);
      const result = await api<{ files: { url: string }[] }>("/api/uploads", { method: "POST", body: form });
      await send(result.files[0]?.url);
    } finally {
      setUploading(false);
    }
  }

  async function sendVoice(blob: Blob, conversationId: string, durationMs: number) {
    const localUrl = URL.createObjectURL(blob);
    const pendingId = `pending-${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      conversationId,
      text: "",
      imageUrl: null,
      audioUrl: localUrl,
      audioSeconds: durationMs / 1000,
      deleted: false,
      createdAt: new Date().toISOString(),
      author: user
        ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
        : null,
    };
    setError("");
    setMessages((current) => [...current, pending]);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("durationMs", String(Math.round(durationMs)));
      form.append("file", blob, `voice.${ext}`);
      const upload = await api<{ url: string }>("/api/uploads/voice", { method: "POST", body: form });
      const result = await api<{ message: ChatMessage }>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: "", audioUrl: upload.url }),
      });
      setMessages((current) => {
        const withoutDup = current.filter((item) => item.id !== result.message.id && item.id !== pendingId);
        return [...withoutDup, result.message];
      });
      loadLists().catch(() => undefined);
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      setError(err instanceof Error ? err.message : "Could not send the voice message");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  async function startRecording() {
    if (!activeId || recorderRef.current) return;
    setError("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Allow microphone access in your browser to record a voice message.");
      return;
    }
    const mimeType = VOICE_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
    const conversationId = activeId;
    const startedAt = Date.now();
    const chunks: Blob[] = [];
    discardRecording.current = false;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setRecordingSince(null);
      if (discardRecording.current) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      const durationMs = Math.min(Date.now() - startedAt, MAX_VOICE_MS);
      if (durationMs < MIN_VOICE_MS || !blob.size) {
        setError("That recording was too short. Tap the microphone and speak for at least a second.");
        return;
      }
      sendVoice(blob, conversationId, durationMs).catch(() => undefined);
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setRecordingSince(startedAt);
    setRecordingMs(0);
  }

  function stopRecording(discard: boolean) {
    const recorder = recorderRef.current;
    if (!recorder) return;
    discardRecording.current = discard;
    if (recorder.state !== "inactive") recorder.stop();
  }

  const unread = (items: Conversation[]) => items.reduce((sum, item) => sum + (item.id === activeId ? 0 : item.unreadCount), 0);
  const needle = query.trim().toLowerCase().replace(/^[@#]/, "");
  const list = (scope === "topic" ? rooms : inbox).filter(
    (item) =>
      !needle ||
      titleOf(item).toLowerCase().includes(needle) ||
      item.members.some((member) => member.username.includes(needle) || member.displayName.toLowerCase().includes(needle)),
  );
  const showThread = Boolean(activeId);
  const canSend = Boolean(text.trim()) && !uploading;

  return (
    <div
      className={cn(
        "flex",
        showThread
          ? "-mb-24 h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] lg:mb-0 lg:h-dvh"
          : "min-h-[calc(100dvh-6rem)] md:-mb-24 md:h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] lg:mb-0 lg:h-dvh",
      )}
    >
      <section className={cn("flex w-full min-h-0 flex-col border-neutral-200 md:w-[360px] md:shrink-0 md:border-r xl:w-[380px]", showThread && "hidden md:flex")}>
        <div className="page-wash sticky top-0 z-10 space-y-3 border-b border-[#f0e6d8] px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">Messages</h1>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                title="New Group"
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 px-2.5 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 md:w-8 md:justify-center md:px-0"
                onClick={() => setComposerMode("group")}
              >
                <Users size={15} className="shrink-0" />
                <span className="md:sr-only">New Group</span>
              </button>
              <button
                type="button"
                className="gold-fill inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold shadow-sm transition"
                onClick={() => setComposerMode("dm")}
              >
                <SquarePen size={14} />
                New Message
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1 text-sm">
            {(
              [
                ["inbox", "Inbox", unread(inbox)],
                ["topic", "Rooms", unread(rooms)],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium transition",
                  scope === key ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
                )}
                onClick={() => setScope(key)}
              >
                {label}
                {count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#ff7a18] px-1.5 text-[11px] font-semibold leading-5 text-black">{count > 99 ? "99+" : count}</span>}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 transition focus-within:border-[#f0a020] focus-within:bg-white">
            <Search size={15} className="shrink-0 text-neutral-400" />
            <input
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 focus-visible:shadow-none"
              placeholder={scope === "topic" ? "Search rooms" : "Search people and groups"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" className="text-neutral-400 hover:text-neutral-700" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && list.length === 0 ? (
            <Spinner label="Loading chats" />
          ) : list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff4e0] text-[#c56a00]">
                {scope === "topic" ? <Hash size={22} /> : <MessageCircle size={22} />}
              </span>
              <p className="mt-3 font-semibold">{needle ? "No matches" : scope === "topic" ? "No rooms yet" : "No conversations yet"}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {needle ? "Try another name." : scope === "topic" ? "Public rooms will show up here." : "Start a direct message or a group with people you follow."}
              </p>
              {!needle && scope === "inbox" && (
                <Button type="button" className="mt-4" onClick={() => setComposerMode("dm")}>
                  <SquarePen size={15} /> New Message
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {list.map((item) => {
                const selected = item.id === activeId;
                const count = selected ? 0 : item.unreadCount;
                return (
                  <li key={item.id} className="group relative">
                    <Link
                      href={`/chat/${item.id}`}
                      onMouseEnter={() => prefetchMessages(item.id)}
                      onTouchStart={() => prefetchMessages(item.id)}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        showConversation(item.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                        selected ? "bg-[#fff4e0]" : "hover:bg-white/70",
                      )}
                    >
                      <ConversationAvatar convo={item} viewerId={user?.id} size={46} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate", count > 0 ? "font-bold" : "font-semibold")}>{titleOf(item)}</span>
                          {item.lastMessageAt && <span className={cn("shrink-0 text-xs", count > 0 ? "font-semibold text-[#c56a00]" : "text-neutral-400")}>{timeAgo(item.lastMessageAt)}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-sm", count > 0 ? "font-medium text-neutral-900" : "text-neutral-500")}>
                            {item.lastMessageText || item.description || "No messages yet"}
                          </p>
                          {count > 0 && <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#ff7a18] px-1.5 text-[11px] font-semibold leading-5 text-black">{count > 99 ? "99+" : count}</span>}
                        </div>
                      </div>
                    </Link>
                    {item.type === "dm" && !item.lastMessageText && (
                      <button
                        type="button"
                        title="Delete empty chat"
                        aria-label="Delete empty chat"
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-neutral-400 shadow-sm transition hover:text-[#ff5d73] md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => {
                          removeEmpty(item.id).catch((err) => setError(err instanceof Error ? err.message : "Could not delete the chat"));
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {error && !showThread && <p className="px-4 py-3 text-sm text-[#ff5d73]">{error}</p>}
        </div>
      </section>

      <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-white/25", !showThread && "hidden md:flex")}>
        {!activeId && (
          <div className="grid flex-1 place-items-center px-6">
            <div className="max-w-sm text-center">
              <span className="gold-fill mx-auto grid h-16 w-16 place-items-center rounded-3xl shadow-glow">
                <MessageCircle size={28} />
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">Your messages</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Pick a conversation on the left, or start a new one with the buttons above the list. Topic rooms are public. Direct messages and groups stay private to their members.
              </p>
            </div>
          </div>
        )}
        {activeId && (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-[#f0e6d8] bg-[url('/bg/chat-pattern.svg')] bg-[length:240px_240px] bg-fixed bg-repeat px-3 py-2.5 sm:px-4">
              <Link
                href="/chat"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100 md:hidden"
                aria-label="Back to chats"
                onClick={(event) => {
                  event.preventDefault();
                  showConversation("");
                }}
              >
                <ArrowLeft size={20} />
              </Link>
              {active && <ConversationAvatar convo={active} viewerId={user?.id} size={40} />}
              <div className="min-w-0 flex-1">
                {active?.type === "dm" && otherMember(active, user?.id) ? (
                  <Link href={`/u/${otherMember(active, user?.id)!.username}`} className="block truncate font-semibold hover:underline">
                    {active.name}
                  </Link>
                ) : (
                  <h2 className="truncate font-semibold">{active ? titleOf(active) : "Chat"}</h2>
                )}
                <p className="truncate text-xs text-neutral-500">
                  {active?.type === "topic"
                    ? `Public room${active.description ? ` · ${active.description}` : ""}`
                    : active?.type === "group"
                      ? `${active.memberCount} members`
                      : active
                        ? `@${otherMember(active, user?.id)?.username || ""}`
                        : ""}
                </p>
              </div>
              {active?.type === "group" && (
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 px-3 text-sm text-neutral-700 transition hover:bg-neutral-50"
                  onClick={() => setMembersOpen(true)}
                >
                  <Users size={15} /> Group info
                </button>
              )}
              {active?.type === "dm" && messagesReady && messages.length === 0 && (
                <button
                  type="button"
                  title="Delete empty chat"
                  aria-label="Delete empty chat"
                  className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-[#ff5d73]"
                  onClick={() => {
                    removeEmpty(active.id).catch((err) => setError(err instanceof Error ? err.message : "Could not delete the chat"));
                  }}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[url('/bg/chat-pattern.svg')] bg-[length:240px_240px] bg-fixed bg-repeat px-3 py-4 sm:px-5">
              {!messagesReady ? (
                <Spinner label="Opening chat" />
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  {active && <ConversationAvatar convo={active} viewerId={user?.id} size={72} />}
                  <p className="mt-4 text-lg font-semibold">{active ? titleOf(active) : "New chat"}</p>
                  <p className="mt-1 max-w-xs text-sm text-neutral-500">
                    {active?.type === "dm" ? `This is the start of your conversation with ${active.name}. Say hello.` : "No messages yet. Be the first to say something."}
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl">
                  {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const next = messages[index + 1];
                    const newDay = !previous || !sameDay(previous.createdAt, message.createdAt);
                    return (
                      <div key={message.id}>
                        {newDay && (
                          <div className="my-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-neutral-200" />
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500 shadow-sm ring-1 ring-neutral-200">
                              {dayLabel(message.createdAt)}
                            </span>
                            <span className="h-px flex-1 bg-neutral-200" />
                          </div>
                        )}
                        <MessageRow
                          message={message}
                          mine={message.author?.id === user?.id}
                          showName={active?.type !== "dm"}
                          first={!joinsPrevious(message, previous)}
                          last={!next || !joinsPrevious(next, message)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={bottom} />
            </div>

            <form
              className="shrink-0 border-t border-[#f0e6d8] bg-[url('/bg/chat-pattern.svg')] bg-[length:240px_240px] bg-fixed bg-repeat px-3 py-2.5 sm:px-4"
              onSubmit={(event) => {
                event.preventDefault();
                send().catch((err) => setError(err instanceof Error ? err.message : "Could not send"));
              }}
            >
              {error && (
                <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 rounded-xl bg-[#fff0f2] px-3 py-2 text-sm text-[#d6334d]">
                  <span>{error}</span>
                  <button type="button" aria-label="Dismiss" onClick={() => setError("")}>
                    <X size={15} />
                  </button>
                </div>
              )}
              {recordingSince != null ? (
                <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-[24px] border border-[#ffc7cf] bg-[#fff5f6] p-1.5" role="status" aria-live="polite">
                  <button
                    type="button"
                    title="Cancel recording"
                    aria-label="Cancel recording"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 transition hover:bg-white hover:text-[#d6334d]"
                    onClick={() => stopRecording(true)}
                  >
                    <Trash2 size={18} />
                  </button>
                  <span className="relative grid h-3 w-3 shrink-0 place-items-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff3b55]/60" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-[#ff3b55]" />
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[#d6334d]">{formatDuration(recordingMs)}</span>
                  <span className="flex h-6 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
                    {Array.from({ length: 28 }, (_, index) => (
                      <span
                        key={index}
                        className="w-[3px] animate-pulse rounded-full bg-[#ff7a8c]"
                        style={{ height: `${30 + ((index * 37) % 70)}%`, animationDelay: `${(index % 7) * 120}ms` }}
                      />
                    ))}
                  </span>
                  <span className="hidden text-xs text-neutral-400 sm:inline">max {formatDuration(MAX_VOICE_MS)}</span>
                  <button
                    type="button"
                    title="Send voice message"
                    aria-label="Send voice message"
                    className="gold-fill grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition"
                    onClick={() => stopRecording(false)}
                  >
                    <Send size={16} />
                  </button>
                </div>
              ) : (
              <div className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-[24px] border border-neutral-200 bg-neutral-50 p-1.5 transition focus-within:border-[#f0a020] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#f0a020]/10">
                <label
                  title="Attach a photo"
                  className={cn(
                    "grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-neutral-500 transition hover:bg-[#fff4e0] hover:text-[#c56a00]",
                    uploading && "pointer-events-none",
                  )}
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={19} />}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) uploadImage(file).catch((err) => setError(err instanceof Error ? err.message : "Upload failed"));
                    }}
                  />
                </label>
                <textarea
                  ref={textarea}
                  rows={1}
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-5 outline-none placeholder:text-neutral-400 focus-visible:shadow-none"
                  placeholder={active?.type === "topic" ? `Message #${active.slug}` : active ? `Message ${active.name}` : "Message"}
                  value={text}
                  maxLength={1000}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send().catch((err) => setError(err instanceof Error ? err.message : "Could not send"));
                    }
                  }}
                />
                {canRecord && !text.trim() ? (
                  <button
                    type="button"
                    title="Record a voice message"
                    aria-label="Record a voice message"
                    disabled={uploading}
                    className="gold-fill grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition disabled:opacity-40"
                    onClick={() => {
                      startRecording().catch((err) => setError(err instanceof Error ? err.message : "Could not start recording"));
                    }}
                  >
                    <Mic size={17} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={!canSend}
                    className="gold-fill grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
              )}
            </form>
          </>
        )}
      </section>

      {composerMode && (
        <StartChat
          mode={composerMode}
          onClose={() => setComposerMode(null)}
          onCreated={(id) => {
            setComposerMode(null);
            loadLists().catch(() => undefined);
            showConversation(id);
          }}
        />
      )}
      {membersOpen && active?.type === "group" && (
        <GroupInfo
          conversation={active}
          onClose={() => setMembersOpen(false)}
          onChanged={() => loadLists().catch(() => undefined)}
          onLeft={() => {
            setMembersOpen(false);
            loadLists().catch(() => undefined);
            showConversation("");
          }}
        />
      )}
    </div>
  );
}

function ConversationAvatar({ convo, viewerId, size }: { convo: Conversation; viewerId?: string; size: number }) {
  if (convo.type === "topic") {
    return (
      <span className="grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#fff1d6] to-[#ffd79a] text-[#a35400]" style={{ width: size, height: size }}>
        <Hash size={Math.round(size * 0.45)} strokeWidth={2.4} />
      </span>
    );
  }
  if (convo.type === "dm") {
    const other = otherMember(convo, viewerId);
    return <Avatar name={other?.displayName || convo.name} url={other?.avatarUrl} size={size} />;
  }
  if (convo.avatarUrl) return <Avatar name={convo.name} url={convo.avatarUrl} size={size} />;
  const faces = convo.members.filter((member) => member.id !== viewerId).slice(0, 2);
  if (faces.length < 2) {
    return (
      <span className="grid shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600" style={{ width: size, height: size }}>
        <Users size={Math.round(size * 0.42)} />
      </span>
    );
  }
  const small = Math.round(size * 0.68);
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="absolute left-0 top-0">
        <Avatar name={faces[0].displayName} url={faces[0].avatarUrl} size={small} />
      </span>
      <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-white">
        <Avatar name={faces[1].displayName} url={faces[1].avatarUrl} size={small} />
      </span>
    </span>
  );
}

function MessageRow({
  message,
  mine,
  showName,
  first,
  last,
}: {
  message: ChatMessage;
  mine: boolean;
  showName: boolean;
  first: boolean;
  last: boolean;
}) {
  const pending = isPending(message);
  const imageOnly = Boolean(message.imageUrl && !message.text && !message.deleted);
  return (
    <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", first ? "mt-3" : "mt-0.5")}>
      {!mine && (
        <span className="w-8 shrink-0">
          {last && (
            <Link href={message.author ? `/u/${message.author.username}` : "#"} aria-label={message.author?.displayName || "Removed user"}>
              <Avatar name={message.author?.displayName || "Removed"} url={message.author?.avatarUrl} size={32} />
            </Link>
          )}
        </span>
      )}
      <div className={cn("flex min-w-0 max-w-[78%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
        {!mine && showName && first && <span className="mb-1 ml-3 text-xs font-medium text-neutral-500">{message.author?.displayName || "Removed user"}</span>}
        <div className={cn("flex items-center gap-1.5", mine && "flex-row-reverse")}>
          <div
            className={cn(
              "min-w-0 rounded-[20px] transition",
              imageOnly ? "p-0" : cn("px-3.5 py-2 shadow-sm", mine ? "gold-fill" : "bg-white text-neutral-900 ring-1 ring-neutral-200"),
              mine && last && "rounded-br-md",
              !mine && last && "rounded-bl-md",
              pending && "opacity-70",
            )}
          >
            {message.deleted ? (
              <p className="text-sm italic opacity-70">Message removed</p>
            ) : (
              <>
                {message.imageUrl && (
                  <a href={mediaUrl(message.imageUrl)} target="_blank" rel="noreferrer" className="block">
                    <img src={mediaUrl(message.imageUrl)} alt="Shared image" className={cn("max-h-72 rounded-2xl object-cover", message.text && "mb-1.5")} />
                  </a>
                )}
                {message.audioUrl && (
                  <VoicePlayer
                    src={message.audioUrl.startsWith("blob:") ? message.audioUrl : mediaUrl(message.audioUrl)}
                    seconds={message.audioSeconds ?? savedVoiceSeconds(message.audioUrl)}
                    mine={mine}
                  />
                )}
                {message.text && <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.35rem]">{message.text}</p>}
              </>
            )}
          </div>
          {!mine && !message.deleted && !pending && (
            <span className="shrink-0 opacity-60 transition md:opacity-0 md:group-hover:opacity-100">
              <ReportButton targetType="message" targetId={message.id} label="" />
            </span>
          )}
        </div>
        {last && (
          <span className={cn("mt-1 text-[11px] text-neutral-400", mine ? "mr-2" : "ml-3")}>
            {pending ? "Sending…" : clock(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function waveform(seed: string, bars: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  return Array.from({ length: bars }, (_, index) => {
    hash = (hash * 1103515245 + 12345 + index) | 0;
    return 28 + (Math.abs(hash) % 72);
  });
}

/** Voice files are saved as name-12s.webm, so the length is known before the file loads. */
function savedVoiceSeconds(url: string) {
  const match = url.split("?")[0].match(/-(\d+)s\.(webm|ogg|m4a|mp3|wav)$/i);
  return match ? Number(match[1]) : undefined;
}

function VoicePlayer({ src, seconds, mine }: { src: string; seconds?: number; mine: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const probing = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(seconds || 0);
  const [position, setPosition] = useState(0);
  const bars = useMemo(() => waveform(src, 30), [src]);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  function readDuration() {
    const element = audio.current;
    if (!element) return;
    if (Number.isFinite(element.duration) && element.duration > 0) {
      setDuration(element.duration);
      if (probing.current) {
        probing.current = false;
        element.currentTime = 0;
      }
    } else if (seconds) {
      setDuration(seconds);
    } else if (!probing.current) {
      // Recorded WebM files often report no duration until the end has been read.
      probing.current = true;
      element.currentTime = 1e101;
    }
  }

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      document.querySelectorAll("audio").forEach((other) => {
        if (other !== element) other.pause();
      });
      element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const element = audio.current;
    if (!element || !duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    element.currentTime = ratio * duration;
    setPosition(element.currentTime);
  }

  return (
    <div className="flex w-60 max-w-full items-center gap-2.5 py-0.5">
      <button
        type="button"
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full transition",
          mine ? "bg-[#1a1004] text-[#f6b429] hover:bg-black" : "gold-fill shadow-sm",
        )}
        onClick={toggle}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-7 cursor-pointer items-center gap-[2px]" onClick={seek} role="presentation">
          {bars.map((height, index) => {
            const filled = (index + 0.5) / bars.length <= progress;
            return (
              <span
                key={index}
                className={cn(
                  "w-[3px] shrink-0 rounded-full transition-colors",
                  mine ? (filled ? "bg-[#1a1004]" : "bg-[#1a1004]/30") : filled ? "bg-[#e39b12]" : "bg-neutral-300",
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <p className={cn("mt-0.5 text-[11px] tabular-nums", mine ? "text-[#1a1004]/70" : "text-neutral-500")}>
          {playing || position > 0 ? formatDuration(position * 1000) : duration ? formatDuration(duration * 1000) : "Voice message"}
        </p>
      </div>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={readDuration}
        onDurationChange={readDuration}
        onTimeUpdate={() => {
          if (!probing.current && audio.current) setPosition(audio.current.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
      />
    </div>
  );
}

function GroupInfo({
  conversation,
  onClose,
  onChanged,
  onLeft,
}: {
  conversation: Conversation;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onLeft: () => void;
}) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState(conversation.name);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = conversation.members.some((member) => member.id === user?.id && member.role === "admin");
  const members = [...conversation.members].sort((left, right) => {
    if (left.role !== right.role) return left.role === "admin" ? -1 : 1;
    return left.displayName.localeCompare(right.displayName);
  });

  useEffect(() => {
    setName(conversation.name);
  }, [conversation.name]);

  async function run(task: () => Promise<void>, done?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await onChanged();
      if (done) setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function updateGroup(patch: { name?: string; avatarUrl?: string | null }, done: string) {
    return run(async () => {
      await api(`/api/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    }, done);
  }

  function changePhoto(file: File) {
    return run(async () => {
      const form = new FormData();
      form.append("files", file);
      const upload = await api<{ files: { url: string }[] }>("/api/uploads", { method: "POST", body: form });
      await api(`/api/conversations/${conversation.id}`, { method: "PATCH", body: JSON.stringify({ avatarUrl: upload.files[0]?.url }) });
    }, "Group photo updated.");
  }

  function setRole(member: Conversation["members"][number], role: "admin" | "member") {
    return run(
      async () => {
        await api(`/api/conversations/${conversation.id}/members/${member.username}/role`, { method: "POST", body: JSON.stringify({ role }) });
      },
      role === "admin" ? `${member.displayName} is now an admin.` : `${member.displayName} is no longer an admin.`,
    );
  }

  return (
    <Modal title="Group info" onClose={onClose}>
      <div className="-mx-1 max-h-[72dvh] overflow-y-auto px-1">
        <div className="flex flex-col items-center text-center">
          <ConversationAvatar convo={conversation} viewerId={user?.id} size={84} />
          {isAdmin ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <label className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 px-3 text-sm hover:bg-neutral-100", busy && "pointer-events-none opacity-50")}>
                <Camera size={15} />
                {conversation.avatarUrl ? "Change group photo" : "Add group photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) changePhoto(file).catch(() => undefined);
                  }}
                />
              </label>
              {conversation.avatarUrl && (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-300 px-3 text-sm text-neutral-700 hover:text-[#d6334d] disabled:opacity-50"
                  onClick={() => updateGroup({ avatarUrl: null }, "Group photo removed.").catch(() => undefined)}
                >
                  <X size={15} /> Remove photo
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-lg font-semibold">{conversation.name}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            {conversation.memberCount} members · up to 50{isAdmin ? "" : " · only admins can change the name and photo"}
          </p>
        </div>

        {isAdmin && (
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateGroup({ name: name.trim() }, "Group name saved.").catch(() => undefined);
            }}
          >
            <label htmlFor="group-name" className="text-sm text-neutral-600">Group name</label>
            <div className="mt-1.5 flex gap-2">
              <input id="group-name" className={inputClass} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} required />
              <Button type="submit" className="shrink-0" disabled={busy || !name.trim() || name.trim() === conversation.name}>
                <Pencil size={14} /> Save
              </Button>
            </div>
          </form>
        )}

        {isAdmin && (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                await api(`/api/conversations/${conversation.id}/members`, { method: "POST", body: JSON.stringify({ username }) });
                setUsername("");
              }, "Member added.").catch(() => undefined);
            }}
          >
            <label htmlFor="group-add" className="text-sm text-neutral-600">Add a member</label>
            <div className="mt-1.5 flex gap-2">
              <input id="group-add" className={inputClass} placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value.replace("@", ""))} required />
              <Button type="submit" disabled={busy} className="shrink-0">
                <UserPlus size={15} /> Add
              </Button>
            </div>
          </form>
        )}

        {(error || notice) && (
          <p className={cn("mt-3 rounded-xl px-3 py-2 text-sm", error ? "bg-[#fff0f2] text-[#d6334d]" : "bg-[#effaf3] text-[#1f7a45]")}>{error || notice}</p>
        )}

        <h3 className="mt-5 text-sm font-semibold text-neutral-800">Members</h3>
        <ul className="mt-2 divide-y divide-neutral-100">
          {members.map((member) => {
            const self = member.id === user?.id;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <Avatar name={member.displayName} url={member.avatarUrl} size={38} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${member.username}`} className="flex items-center gap-1.5 text-sm font-semibold hover:underline">
                    <span className="truncate">{member.displayName}</span>
                    {self && <span className="shrink-0 font-normal text-neutral-500">(you)</span>}
                  </Link>
                  <p className="truncate text-xs text-neutral-500">@{member.username}</p>
                </div>
                {member.role === "admin" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] px-2 py-0.5 text-xs font-medium text-[#a35400]">
                    <ShieldCheck size={12} /> Admin
                  </span>
                )}
                {isAdmin && !self && (
                  <div className="flex w-full justify-end gap-1.5 sm:w-auto">
                    <button
                      type="button"
                      disabled={busy}
                      className="h-8 rounded-full border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                      onClick={() => setRole(member, member.role === "admin" ? "member" : "admin").catch(() => undefined)}
                    >
                      {member.role === "admin" ? "Remove admin" : "Make admin"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="h-8 rounded-full border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition hover:border-[#ffc7cf] hover:bg-[#fff5f6] hover:text-[#d6334d] disabled:opacity-50"
                      onClick={() => {
                        if (!window.confirm(`Remove ${member.displayName} from ${conversation.name}?`)) return;
                        run(async () => {
                          await api(`/api/conversations/${conversation.id}/members/${member.username}`, { method: "DELETE" });
                        }, `${member.displayName} was removed.`).catch(() => undefined);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {user && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full text-[#d6334d]"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Leave ${conversation.name}?`)) return;
              setBusy(true);
              api(`/api/conversations/${conversation.id}/members/${user.username}`, { method: "DELETE" })
                .then(onLeft)
                .catch((err) => setError(err instanceof Error ? err.message : "Could not leave the group"))
                .finally(() => setBusy(false));
            }}
          >
            Leave group
          </Button>
        )}
      </div>
    </Modal>
  );
}

function StartChat({
  mode,
  onClose,
  onCreated,
}: {
  mode: "dm" | "group";
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [people, setPeople] = useState("");
  const [matches, setMatches] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (username.trim().length < 1) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ users: PublicUser[] }>(`/api/conversations/suggest?q=${encodeURIComponent(username.trim().replace("@", ""))}`)
        .then((data) => setMatches(data.users))
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [username]);

  async function open(target: string) {
    setError("");
    setBusy(true);
    try {
      const body =
        mode === "dm"
          ? { type: "dm", username: target.replace("@", "").toLowerCase() }
          : {
              type: "group",
              name,
              usernames: people
                .split(",")
                .map((item) => item.trim().replace("@", "").toLowerCase())
                .filter(Boolean),
            };
      const result = await api<{ conversation: Conversation }>("/api/conversations", { method: "POST", body: JSON.stringify(body) });
      onCreated(result.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the chat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={mode === "dm" ? "New Message" : "New Group"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          open(username).catch(() => undefined);
        }}
      >
        {mode === "group" && <input className={inputClass} placeholder="Group name" value={name} onChange={(event) => setName(event.target.value)} required />}
        {mode === "dm" ? (
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 transition focus-within:border-[#f0a020] focus-within:ring-4 focus-within:ring-[#f0a020]/10">
            <Search size={16} className="shrink-0 text-neutral-400" />
            <input className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 focus-visible:shadow-none" placeholder="Search by name or @username" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus required />
          </label>
        ) : (
          <input className={inputClass} placeholder="Usernames, separated by commas" value={people} onChange={(event) => setPeople(event.target.value)} />
        )}
        {mode === "dm" && matches.length > 0 && (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {matches.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-neutral-50"
                  onClick={() => open(match.username).catch(() => undefined)}
                >
                  <Avatar name={match.displayName} url={match.avatarUrl} size={38} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{match.displayName}</span>
                    <span className="block truncate text-xs text-neutral-500">@{match.username}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {mode === "group" && <p className="text-xs text-neutral-500">Up to 50 members. People can leave, and the creator can remove members.</p>}
        {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Opening…" : mode === "dm" ? "Open chat" : "Create group"}
        </Button>
      </form>
    </Modal>
  );
}
