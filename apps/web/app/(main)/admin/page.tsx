"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, MessagesSquare, SquarePen, Users } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, Empty, inputClass, Modal, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PublicUser, Report } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

type Tab = "overview" | "people" | "posts" | "rooms" | "reports";

type Overview = { people: number; posts: number; openReports: number; rooms: number };

type AdminUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  suspended: boolean;
  createdAt: string;
};

type AdminPost = {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  author: PublicUser | null;
};

type AdminRoom = { id: string; name: string; slug: string | null; description: string };

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "posts", label: "Posts" },
  { id: "rooms", label: "Rooms" },
  { id: "reports", label: "Reports" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  if (user?.role !== "admin") {
    return (
      <div>
        <PageHeader title="Admin" subtitle="Site management" />
        <p className="px-4 py-8 text-sm text-neutral-500">This page is only for the site admins.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin" subtitle="People, posts, rooms, and reports" />
      <div className="flex gap-1 overflow-x-auto border-b border-[#f0e6d8] px-3 py-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium",
              tab === item.id ? "bg-white text-neutral-950 shadow-sm ring-1 ring-[#f0e6d8]" : "text-neutral-500 hover:bg-white/70",
            )}
            onClick={() => {
              setError("");
              setTab(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <p className="px-4 pt-3 text-sm text-[#ff5d73]">{error}</p>}
      {tab === "overview" && <OverviewTab onError={setError} onOpen={setTab} />}
      {tab === "people" && <PeopleTab onError={setError} />}
      {tab === "posts" && <PostsTab onError={setError} />}
      {tab === "rooms" && <RoomsTab onError={setError} />}
      {tab === "reports" && <ReportsTab onError={setError} />}
    </div>
  );
}

function OverviewTab({ onError, onOpen }: { onError: (message: string) => void; onOpen: (tab: Tab) => void }) {
  const [stats, setStats] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>("/api/admin/overview")
      .then(setStats)
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load the overview"));
  }, [onError]);

  if (!stats) return <Spinner label="Loading overview" />;

  const cards: {
    tab: Tab;
    label: string;
    value: number;
    hint: string;
    icon: typeof Users;
    wash: string;
    iconClass: string;
  }[] = [
    {
      tab: "people",
      label: "People",
      value: stats.people,
      hint: "Accounts",
      icon: Users,
      wash: "bg-[#f6b429]/25",
      iconClass: "bg-[#fff4e0] text-[#a35400]",
    },
    {
      tab: "posts",
      label: "Posts",
      value: stats.posts,
      hint: "Visible now",
      icon: SquarePen,
      wash: "bg-[#f0a020]/15",
      iconClass: "bg-white text-neutral-800 ring-1 ring-[#f0e6d8]",
    },
    {
      tab: "rooms",
      label: "Topic rooms",
      value: stats.rooms,
      hint: "Conversations",
      icon: MessagesSquare,
      wash: "bg-[#f6b429]/20",
      iconClass: "bg-[#fff4e0] text-[#a35400]",
    },
    {
      tab: "reports",
      label: "Open reports",
      value: stats.openReports,
      hint: stats.openReports ? "Need a look" : "All clear",
      icon: Flag,
      wash: stats.openReports ? "bg-[#ff5d73]/20" : "bg-emerald-400/15",
      iconClass: stats.openReports ? "bg-[#fff0f2] text-[#d6334d]" : "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {cards.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onOpen(item.tab)}
          className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-4 text-left shadow-[0_16px_40px_-24px_rgba(120,72,8,0.55)] ring-1 ring-[#f0e6d8] transition duration-200 hover:-translate-y-0.5 hover:bg-white"
        >
          <span aria-hidden className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl", item.wash)} />
          <span className={cn("relative grid h-9 w-9 place-items-center rounded-2xl", item.iconClass)}>
            <item.icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <p className="relative mt-5 font-serif text-4xl leading-none tracking-tight">{item.value}</p>
          <p className="relative mt-2 text-sm font-semibold text-neutral-950">{item.label}</p>
          <p className="relative text-xs text-neutral-500">{item.hint}</p>
        </button>
      ))}
    </div>
  );
}

const PAGE_SIZE = 10;

function PageBar({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e6d8] px-4 py-3">
      <p className="text-xs text-neutral-500">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="text-xs text-neutral-500">
          Page {page} of {pages}
        </span>
        <Button type="button" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function PeopleTab({ onError }: { onError: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busy, setBusy] = useState("");

  function load(q = query, nextPage = page) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(nextPage));
    return api<{ users: AdminUser[]; total: number; page: number }>(`/api/admin/users?${params}`)
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPage(data.page);
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load people"));
  }

  useEffect(() => {
    load("", 1).catch(() => undefined);
  }, []);

  async function setSuspended(person: AdminUser, suspended: boolean) {
    setBusy(person.id);
    try {
      await api(`/api/admin/users/${person.id}/suspend`, { method: "POST", body: JSON.stringify({ suspended }) });
      setUsers((current) => current?.map((item) => (item.id === person.id ? { ...item, suspended } : item)) || null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update this account");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <form
        className="flex gap-2 border-b border-[#f0e6d8] px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(query, 1).catch(() => undefined);
        }}
      >
        <input className={inputClass} placeholder="Search name, username, or email" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="submit">Search</Button>
      </form>
      {!users ? (
        <Spinner label="Loading people" />
      ) : users.length === 0 ? (
        <Empty title="No people found" body="Try another name or email." />
      ) : (
        <ul>
          {users.map((person) => (
            <li key={person.id} className="flex items-center gap-3 border-b border-[#f0e6d8] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  <Link href={`/u/${person.username}`} className="hover:underline">
                    {person.displayName}
                  </Link>{" "}
                  <span className="font-normal text-neutral-500">@{person.username}</span>
                  {person.role === "admin" && <span className="ml-2 rounded-full bg-[#fff4e0] px-2 py-0.5 text-xs font-medium text-[#a35400]">Admin</span>}
                  {person.suspended && <span className="ml-2 rounded-full bg-[#fff0f2] px-2 py-0.5 text-xs font-medium text-[#d6334d]">Suspended</span>}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {person.email} · joined {timeAgo(person.createdAt)}
                </p>
              </div>
              {person.role !== "admin" && (
                <Button variant={person.suspended ? "outline" : "danger"} disabled={busy === person.id} onClick={() => setSuspended(person, !person.suspended)}>
                  {person.suspended ? "Restore" : "Suspend"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {users && <PageBar page={page} total={total} onPage={(next) => load(query, next).catch(() => undefined)} />}
    </div>
  );
}

function PostsTab({ onError }: { onError: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [busy, setBusy] = useState("");

  function load(q = query, nextPage = page) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(nextPage));
    return api<{ posts: AdminPost[]; total: number; page: number }>(`/api/admin/posts?${params}`)
      .then((data) => {
        setPosts(data.posts);
        setTotal(data.total);
        setPage(data.page);
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load posts"));
  }

  useEffect(() => {
    load("", 1).catch(() => undefined);
  }, []);

  async function hide(post: AdminPost) {
    if (!window.confirm("Hide this post from the site?")) return;
    setBusy(post.id);
    try {
      await api(`/api/admin/posts/${post.id}/hide`, { method: "POST" });
      await load(query, page);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not hide the post");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <form
        className="flex gap-2 border-b border-[#f0e6d8] px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(query, 1).catch(() => undefined);
        }}
      >
        <input className={inputClass} placeholder="Search post text" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="submit">Search</Button>
      </form>
      {!posts ? (
        <Spinner label="Loading posts" />
      ) : posts.length === 0 ? (
        <Empty title="No posts" body="Nothing matched this search." />
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-3 border-b border-[#f0e6d8] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500">
                  {post.author ? (
                    <Link href={`/u/${post.author.username}`} className="font-medium text-neutral-700 hover:underline">
                      {post.author.displayName}
                    </Link>
                  ) : (
                    "Deleted user"
                  )}{" "}
                  · {timeAgo(post.createdAt)} · {post.likeCount} likes · {post.replyCount} replies
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{post.text || "Image post"}</p>
              </div>
              <Button variant="danger" disabled={busy === post.id} onClick={() => hide(post)}>
                Hide
              </Button>
            </li>
          ))}
        </ul>
      )}
      {posts && <PageBar page={page} total={total} onPage={(next) => load(query, next).catch(() => undefined)} />}
    </div>
  );
}

function RoomsTab({ onError }: { onError: (message: string) => void }) {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rooms, setRooms] = useState<AdminRoom[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "" });
  const [editing, setEditing] = useState<AdminRoom | null>(null);
  const [busy, setBusy] = useState("");

  function load(nextPage = page) {
    return api<{ rooms: AdminRoom[]; total: number; page: number }>(`/api/admin/rooms?page=${nextPage}`)
      .then((data) => {
        setRooms(data.rooms);
        setTotal(data.total);
        setPage(data.page);
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load rooms"));
  }

  useEffect(() => {
    load(1).catch(() => undefined);
  }, []);

  function closeCreate() {
    if (busy === "create") return;
    setCreating(false);
    setDraft({ name: "", slug: "", description: "" });
  }

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    try {
      await api("/api/admin/rooms", { method: "POST", body: JSON.stringify(draft) });
      setDraft({ name: "", slug: "", description: "" });
      setCreating(false);
      await load(1);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create the room");
    } finally {
      setBusy("");
    }
  }

  async function saveRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(editing.id);
    try {
      await api(`/api/admin/rooms/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editing.name, slug: editing.slug, description: editing.description }),
      });
      setEditing(null);
      await load(page);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the room");
    } finally {
      setBusy("");
    }
  }

  async function removeRoom(room: AdminRoom) {
    if (!window.confirm(`Delete #${room.slug}? Its messages will be removed.`)) return;
    setBusy(room.id);
    try {
      await api(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
      if (editing?.id === room.id) setEditing(null);
      await load(page);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete the room");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex justify-end border-b border-[#f0e6d8] px-4 py-3">
        <Button type="button" onClick={() => setCreating(true)}>
          Create room
        </Button>
      </div>
      {!rooms ? (
        <Spinner label="Loading rooms" />
      ) : rooms.length === 0 ? (
        <Empty title="No topic rooms" body="Create a room to give members a place to talk." />
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id} className="border-b border-[#f0e6d8] px-4 py-3">
              {editing?.id === room.id ? (
                <form className="space-y-2" onSubmit={saveRoom}>
                  <input className={inputClass} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required />
                  <input className={inputClass} value={editing.slug || ""} onChange={(event) => setEditing({ ...editing, slug: event.target.value.toLowerCase() })} required />
                  <input className={inputClass} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={busy === room.id}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">#{room.slug}</p>
                    <p className="text-sm">{room.name}</p>
                    <p className="text-xs text-neutral-500">{room.description || "No description"}</p>
                  </div>
                  <Button variant="outline" onClick={() => setEditing(room)}>
                    Edit
                  </Button>
                  <Button variant="danger" disabled={busy === room.id} onClick={() => removeRoom(room)}>
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {rooms && <PageBar page={page} total={total} onPage={(next) => load(next).catch(() => undefined)} />}
      {creating && (
        <Modal title="New topic room" onClose={closeCreate}>
          <form className="space-y-2" onSubmit={createRoom}>
            <input className={inputClass} placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
            <input className={inputClass} placeholder="slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} required />
            <input className={inputClass} placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <Button type="submit" disabled={busy === "create"}>
              Create room
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ReportsTab({ onError }: { onError: (message: string) => void }) {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState("");

  function load(nextPage = page) {
    return api<{ reports: Report[]; total: number; page: number }>(`/api/admin/reports?page=${nextPage}`)
      .then((data) => {
        setReports(data.reports);
        setTotal(data.total);
        setPage(data.page);
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load reports"));
  }

  useEffect(() => {
    load(1).catch(() => undefined);
  }, []);

  async function act(id: string, action: "dismiss" | "hide" | "suspend") {
    setBusy(id);
    try {
      await api(`/api/admin/reports/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      await load(page);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update the report");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      {!reports ? (
        <Spinner label="Loading reports" />
      ) : reports.length === 0 ? (
        <Empty title="No reports" body="Reports from members will show up here." />
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id} className="border-b border-[#f0e6d8] px-4 py-3 text-sm">
              <p>
                <span className="font-semibold">{report.reason}</span> · {report.targetType} · {report.status}
              </p>
              <p className="text-neutral-500">
                {report.reporter?.displayName || "Someone"} · {timeAgo(report.createdAt)}
              </p>
              {report.details && <p className="mt-1">{report.details}</p>}
              {report.status === "open" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="ghost" disabled={busy === report.id} onClick={() => act(report.id, "hide")}>
                    Hide
                  </Button>
                  <Button variant="danger" disabled={busy === report.id} onClick={() => act(report.id, "suspend")}>
                    Hide and suspend
                  </Button>
                  <Button variant="outline" disabled={busy === report.id} onClick={() => act(report.id, "dismiss")}>
                    Dismiss
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {reports && <PageBar page={page} total={total} onPage={(next) => load(next).catch(() => undefined)} />}
    </div>
  );
}
