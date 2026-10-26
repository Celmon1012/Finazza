"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Compass, Hash, Home, LogOut, PieChart, Settings, SquarePen } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Conversation, Investment } from "@/lib/types";
import { DISCLAIMER, cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Avatar, Spinner } from "./ui";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chat", label: "Chatrooms", icon: Hash, badge: "messages" as const },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, badges, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1760px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col justify-between px-3 py-4 xl:w-[280px] lg:flex">
          <div>
            <Link href="/home" className="mb-5 inline-flex px-3">
              <Logo />
            </Link>
            <nav className="space-y-1">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const count = link.badge ? badges[link.badge] : 0;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-4 py-3 text-[1.05rem]",
                      active ? "bg-neutral-100 font-semibold" : "hover:bg-neutral-100",
                    )}
                  >
                    <Icon size={22} />
                    <span className="flex-1">{link.label}</span>
                    {count > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-[#ff7a18] px-1.5 text-xs font-semibold text-black">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link href="/admin" className={cn("flex items-center gap-3 rounded-full px-4 py-3", pathname.startsWith("/admin") && "bg-neutral-100 font-semibold")}>
                  <Settings size={22} /> Admin
                </Link>
              )}
            </nav>
            <Link href="/home" className="gold-fill mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold">
              <SquarePen size={18} /> Post
            </Link>
          </div>
          <button
            type="button"
            className="flex items-center gap-3 rounded-full px-3 py-2 text-left hover:bg-neutral-100"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <Avatar name={user?.displayName || "U"} url={user?.avatarUrl} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user?.displayName}</span>
              <span className="block truncate text-xs text-neutral-500">@{user?.username}</span>
            </span>
            <LogOut size={16} className="text-neutral-500" />
          </button>
        </aside>

        <main className="min-h-screen w-full min-w-0 flex-1 border-x border-neutral-200 pb-20 lg:pb-0">{children}</main>
        <RightRail />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white lg:hidden">
        {links.slice(0, 5).map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          const count = link.badge ? badges[link.badge] : 0;
          return (
            <Link key={link.href} href={link.href} className={cn("relative grid flex-1 place-items-center py-3", active ? "text-[#c56a00]" : "text-neutral-500")}>
              <Icon size={22} />
              {count > 0 && <span className="absolute right-[28%] top-2 h-2 w-2 rounded-full bg-[#ff7a18]" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RightRail() {
  const { user } = useAuth();
  const [items, setItems] = useState<Investment[]>([]);
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ investments: Investment[] }>("/api/investments/me"),
      api<{ conversations: Conversation[] }>("/api/conversations?scope=topic"),
    ])
      .then(([portfolio, chat]) => {
        setItems(portfolio.investments.slice(0, 4));
        setRooms(chat.conversations.slice(0, 5));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[340px] shrink-0 overflow-y-auto px-5 py-4 xl:block 2xl:w-[400px]">
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Portfolio snapshot</h2>
        {loading ? (
          <Spinner label="Loading records" />
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No holdings yet. Add one from Portfolio.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <p className="text-sm">{item.snapshotLabel}</p>
                {item.proof && <p className="text-xs text-[#c56a00]">Proof uploaded (public)</p>}
              </li>
            ))}
          </ul>
        )}
        <Link href="/portfolio" className="mt-4 inline-block text-sm text-[#c56a00]">
          Open portfolio
        </Link>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Topic rooms</h2>
        <ul className="mt-3 space-y-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/chat/${room.id}`} className="block rounded-xl px-2 py-1.5 hover:bg-neutral-100">
                <span className="block text-sm">#{room.slug}</span>
                <span className="block text-xs text-neutral-500">{room.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-4 px-1 text-xs leading-5 text-neutral-500">{DISCLAIMER}</p>
    </aside>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </header>
  );
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-white text-neutral-950">
      <div className="text-center">
        <Logo />
        <Spinner />
      </div>
    </div>
  );
}
