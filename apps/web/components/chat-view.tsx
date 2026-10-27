"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Send } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { getSocket, useAuth } from "@/lib/auth";
import type { ChatMessage, Conversation, PublicUser } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { ReportButton } from "./report-button";
import { Avatar, Button, Empty, inputClass, Modal, Spinner } from "./ui";

export function ChatView({ activeId }: { activeId?: string }) {
  const { user, refreshBadges } = useAuth();
  const router = useRouter();
  const [scope, setScope] = useState<"topic" | "inbox">(activeId ? "inbox" : "topic");
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [composerMode, setComposerMode] = useState<"dm" | "group" | null>(null);
  const [messagesReady, setMessagesReady] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  async function loadLists() {
    const [topic, direct] = await Promise.all([
      api<{ conversations: Conversation[] }>("/api/conversations?scope=topic"),
      api<{ conversations: Conversation[] }>("/api/conversations?scope=inbox"),
    ]);
    setRooms(topic.conversations);
    setInbox(direct.conversations);
    return { topic: topic.conversations, direct: direct.conversations };
  }

  useEffect(() => {
    loadLists()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load chats"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesReady(false);
    api<{ messages: ChatMessage[] }>(`/api/conversations/${activeId}/messages`)
      .then((data) => {
        if (!cancelled) {
          setMessages(data.messages);
          setMessagesReady(true);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not open the chat"));
    api(`/api/conversations/${activeId}/read`, { method: "POST" }).then(() => refreshBadges()).catch(() => undefined);
    loadLists()
      .then(({ topic, direct }) => {
        setActive([...topic, ...direct].find((item) => item.id === activeId) || null);
      })
      .catch(() => undefined);

    const socket = getSocket();
    socket?.emit("conversation:join", activeId);
    const onMessage = (message: ChatMessage) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    };
    socket?.on("message:new", onMessage);
    return () => {
      cancelled = true;
      socket?.emit("conversation:leave", activeId);
      socket?.off("message:new", onMessage);
    };
  }, [activeId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(imageUrl?: string) {
    if (!activeId || (!text.trim() && !imageUrl)) return;
    const body = { text, imageUrl: imageUrl || null };
    const pendingId = `pending-${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      conversationId: activeId,
      text: body.text.trim(),
      imageUrl: body.imageUrl,
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
      setMessages((current) => current.map((item) => (item.id === pendingId ? result.message : item)));
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
    if (activeId === id) router.push("/chat");
  }

  async function uploadImage(file: File) {
    const form = new FormData();
    form.append("files", file);
    const result = await api<{ files: { url: string }[] }>("/api/uploads", { method: "POST", body: form });
    await send(result.files[0]?.url);
  }

  const list = scope === "topic" ? rooms : inbox;
  const showThread = Boolean(activeId);

  return (
    <div className={cn("flex", showThread ? "h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] lg:mb-0 lg:h-dvh -mb-24" : "min-h-screen")}>
      <section className={cn("w-full overflow-y-auto border-neutral-200 md:w-[280px] md:border-r", showThread && "hidden md:block")}>
        <div className="sticky top-0 z-10 bg-white/95 px-3 py-3 backdrop-blur">
          <div className="mb-3 flex gap-2">
            <button type="button" className={cn("rounded-full px-3 py-1.5 text-sm", scope === "topic" && "bg-neutral-100")} onClick={() => setScope("topic")}>
              Rooms
            </button>
            <button type="button" className={cn("rounded-full px-3 py-1.5 text-sm", scope === "inbox" && "bg-neutral-100")} onClick={() => setScope("inbox")}>
              Inbox
            </button>
          </div>
          {scope === "inbox" && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="px-3 py-1.5" onClick={() => setComposerMode("dm")}>
                New message
              </Button>
              <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={() => setComposerMode("group")}>
                New group
              </Button>
            </div>
          )}
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <ul>
            {list.map((item) => (
              <li key={item.id} className="flex items-stretch border-b border-neutral-200">
                <Link href={`/chat/${item.id}`} className={cn("block min-w-0 flex-1 px-4 py-3 hover:bg-neutral-50", item.id === activeId && "bg-neutral-100")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{item.type === "topic" ? `#${item.slug}` : item.name}</span>
                    {item.unreadCount > 0 && <span className="rounded-full bg-[#ff7a18] px-1.5 text-xs text-black">{item.unreadCount}</span>}
                  </div>
                  <p className="truncate text-sm text-neutral-500">{item.lastMessageText || item.description || "No messages yet"}</p>
                </Link>
                {item.type === "dm" && !item.lastMessageText && (
                  <button
                    type="button"
                    className="px-3 text-xs text-[#ff5d73]"
                    onClick={() => {
                      removeEmpty(item.id).catch((err) => setError(err instanceof Error ? err.message : "Could not delete the inbox"));
                    }}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="px-4 py-3 text-sm text-[#ff5d73]">{error}</p>}
      </section>

      <section className={cn("flex min-h-0 flex-1 flex-col", !showThread && "hidden md:flex")}>
        {!activeId && <Empty title="Pick a room" body="Topic rooms are public. Direct messages and groups stay in the inbox." />}
        {activeId && (
          <>
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
              <Link href="/chat" className="md:hidden" aria-label="Back to chats">
                <ArrowLeft />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-semibold">{active ? (active.type === "topic" ? `#${active.slug}` : active.name) : "Chat"}</h1>
                <p className="truncate text-xs text-neutral-500">
                  {active?.type === "topic" ? "Public room" : active?.type === "group" ? `${active.memberCount} members · limit 50` : "Direct message"}
                  {active?.description ? ` · ${active.description}` : ""}
                </p>
              </div>
              {active?.type === "group" && user && <GroupActions conversation={active} onChanged={() => router.push("/chat")} />}
              {active?.type === "dm" && messagesReady && messages.length === 0 && (
                <button
                  type="button"
                  className="text-xs text-[#ff5d73]"
                  onClick={() => {
                    removeEmpty(active.id).catch((err) => setError(err instanceof Error ? err.message : "Could not delete the inbox"));
                  }}
                >
                  Delete inbox
                </button>
              )}
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} mine={message.author?.id === user?.id} />
              ))}
              <div ref={bottom} />
            </div>
            <form
              className="flex shrink-0 items-end gap-2 border-t border-neutral-200 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                send().catch((err) => setError(err instanceof Error ? err.message : "Could not send"));
              }}
            >
              <label className="grid h-10 w-10 place-items-center rounded-full text-[#c56a00]">
                <ImagePlus size={18} />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadImage(file).catch((err) => setError(err instanceof Error ? err.message : "Upload failed"));
                  }}
                />
              </label>
              <textarea
                className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                placeholder={active?.type === "topic" ? `Message #${active.slug}` : "Message"}
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
              <Button type="submit" className="h-10 w-10 px-0" aria-label="Send">
                <Send size={16} />
              </Button>
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
            router.push(`/chat/${id}`);
          }}
        />
      )}
    </div>
  );
}

function MessageRow({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn("flex gap-2", mine && "flex-row-reverse")}>
      <Avatar name={message.author?.displayName || "Removed"} url={message.author?.avatarUrl} size={32} />
      <div className={cn("max-w-[80%] rounded-2xl px-3 py-2", mine ? "bg-[#ff7a18]/20" : "bg-neutral-100")}>
        <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
          <span>{message.author?.displayName}</span>
          <span>{timeAgo(message.createdAt)}</span>
        </div>
        {message.deleted ? (
          <p className="text-sm italic text-neutral-500">Message removed</p>
        ) : (
          <>
            {message.text && <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>}
            {message.imageUrl && <img src={mediaUrl(message.imageUrl)} alt="" className="mt-2 max-h-64 rounded-xl" />}
          </>
        )}
        {!message.deleted && !mine && <div className="mt-1"><ReportButton targetType="message" targetId={message.id} label="" /></div>}
      </div>
    </div>
  );
}

function GroupActions({ conversation, onChanged }: { conversation: Conversation; onChanged: () => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const isAdmin = conversation.members.some((member) => member.id === user?.id && member.role === "admin");

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    await api(`/api/conversations/${conversation.id}/members`, { method: "POST", body: JSON.stringify({ username }) });
    setUsername("");
    location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <form onSubmit={invite} className="hidden items-center gap-2 lg:flex">
          <input className="w-28 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value.replace("@", ""))} />
          <Button type="submit" className="px-3 py-1 text-xs">Add</Button>
        </form>
      )}
      <button
        type="button"
        className="text-xs text-neutral-500"
        onClick={() => {
          if (!user) return;
          api(`/api/conversations/${conversation.id}/members/${user.username}`, { method: "DELETE" }).then(onChanged);
        }}
      >
        Leave
      </button>
    </div>
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

  useEffect(() => {
    if (username.trim().length < 1) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ users: PublicUser[] }>(`/api/conversations/suggest?q=${encodeURIComponent(username.trim())}`)
        .then((data) => setMatches(data.users))
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [username]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const body =
        mode === "dm"
          ? { type: "dm", username: username.replace("@", "").toLowerCase() }
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
    }
  }

  return (
    <Modal title={mode === "dm" ? "New direct message" : "New group"} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        {mode === "group" && <input className={inputClass} placeholder="Group name" value={name} onChange={(event) => setName(event.target.value)} required />}
        {mode === "dm" ? (
          <input className={inputClass} placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        ) : (
          <input className={inputClass} placeholder="Usernames, separated by commas" value={people} onChange={(event) => setPeople(event.target.value)} />
        )}
        {mode === "dm" && matches.length > 0 && (
          <ul className="rounded-xl border border-neutral-200">
            {matches.map((match) => (
              <li key={match.id}>
                <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100" onClick={() => setUsername(match.username)}>
                  {match.displayName} <span className="text-neutral-500">@{match.username}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {mode === "group" && <p className="text-xs text-neutral-500">Up to 50 members. People can leave, and the creator can remove members.</p>}
        {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
        <Button type="submit">{mode === "dm" ? "Open chat" : "Create group"}</Button>
      </form>
    </Modal>
  );
}
