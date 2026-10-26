"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Button, inputClass, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Report } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function AdminPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [room, setRoom] = useState({ name: "", slug: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    return api<{ reports: Report[] }>("/api/admin/reports").then((data) => setReports(data.reports));
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    load().finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== "admin") return <p className="px-4 py-8">Admins only.</p>;

  async function act(id: string, action: "dismiss" | "hide" | "suspend") {
    await api(`/api/admin/reports/${id}`, { method: "POST", body: JSON.stringify({ action }) });
    await load();
  }

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    await api("/api/admin/rooms", { method: "POST", body: JSON.stringify(room) });
    setRoom({ name: "", slug: "", description: "" });
    setMessage("Room created");
  }

  return (
    <div>
      <PageHeader title="Admin" subtitle="Reports, hidden content, rooms" />
      <form className="space-y-2 border-b border-neutral-200 px-4 py-4" onSubmit={createRoom}>
        <h2 className="font-semibold">New topic room</h2>
        <input className={inputClass} placeholder="Name" value={room.name} onChange={(event) => setRoom({ ...room, name: event.target.value })} required />
        <input className={inputClass} placeholder="slug" value={room.slug} onChange={(event) => setRoom({ ...room, slug: event.target.value })} required />
        <input className={inputClass} placeholder="Description" value={room.description} onChange={(event) => setRoom({ ...room, description: event.target.value })} />
        <Button type="submit">Create room</Button>
        {message && <p className="text-sm text-[#3dd68c]">{message}</p>}
      </form>
      {loading && <Spinner />}
      <ul>
        {reports.map((report) => (
          <li key={report.id} className="border-b border-neutral-200 px-4 py-3 text-sm">
            <p>
              <span className="font-semibold">{report.reason}</span> · {report.targetType} · {report.status}
            </p>
            <p className="text-neutral-500">
              {report.reporter?.displayName} · {timeAgo(report.createdAt)}
            </p>
            {report.details && <p className="mt-1">{report.details}</p>}
            {report.status === "open" && (
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => act(report.id, "hide")}>
                  Hide
                </Button>
                <Button variant="danger" onClick={() => act(report.id, "suspend")}>
                  Hide and suspend
                </Button>
                <Button variant="outline" onClick={() => act(report.id, "dismiss")}>
                  Dismiss
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
