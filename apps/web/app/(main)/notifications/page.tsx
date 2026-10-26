"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Avatar, Button, Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AppNotification } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function NotificationsPage() {
  const { refreshBadges } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api<{ notifications: AppNotification[] }>("/api/notifications");
    setItems(data.notifications);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function readAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    refreshBadges();
  }

  async function open(item: AppNotification) {
    if (!item.read) {
      await api(`/api/notifications/${item.id}/read`, { method: "POST" });
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      refreshBadges();
    }
  }

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="flex justify-end border-b border-neutral-200 px-4 py-2">
        <Button variant="ghost" onClick={readAll}>
          Mark all read
        </Button>
      </div>
      {loading && <Spinner />}
      {!loading && items.length === 0 && <Empty title="No notifications" body="Likes, replies, follows, mentions, and chat will land here." />}
      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.read ? "border-b border-neutral-200" : "border-b border-neutral-200 bg-[#ff7a18]/5"}>
            <Link href={item.link} onClick={() => open(item)} className="flex gap-3 px-4 py-3">
              <Avatar name={item.actor?.displayName || "F"} url={item.actor?.avatarUrl} size={36} />
              <span>
                <span className="block text-sm">{item.text}</span>
                <span className="text-xs text-neutral-500">{item.type} · {timeAgo(item.createdAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
