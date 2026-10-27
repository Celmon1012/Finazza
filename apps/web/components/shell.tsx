"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Compass, Home, LogOut, MessageCircle, PieChart, Settings, SquarePen } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Conversation, Investment } from "@/lib/types";
import { DISCLAIMER, cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Avatar, Spinner } from "./ui";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chat", label: "Chatrooms", icon: MessageCircle, badge: "messages" as const },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

const phoneTabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chat", label: "Chat", icon: MessageCircle, badge: "messages" as const },
  { href: "/notifications", label: "Alerts", icon: Bell, badge: "notifications" as const },
];

function SideNav() {
  const pathname = usePathname() || "";
  const { user, badges, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Link href="/home" className="mb-5 inline-flex px-3">
          <Logo />
        </Link>
        <nav className="space-y-1">
          {links.map((link) => {
            const href = link.href === "/portfolio" && user?.username ? `/u/${user.username}?tab=investment` : link.href;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const count = link.badge ? badges[link.badge] : 0;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={href}
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
        aria-label="Log out"
        className="mt-2 flex shrink-0 items-center gap-3 rounded-full border-t border-neutral-200 px-3 py-3 text-left hover:bg-neutral-100"
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
        <LogOut size={16} className="shrink-0 text-neutral-500" />
      </button>
    </div>
  );
}

function AccountSheet({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const rows = [
    { href: user?.username ? `/u/${user.username}?tab=investment` : "/portfolio", label: "Portfolio", hint: "On your profile", icon: PieChart },
    { href: "/settings", label: "Settings", hint: "Profile, privacy, and password", icon: Settings },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", hint: "Moderation", icon: Settings }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close account" onClick={onClose} />
      <div className="sheet-rise absolute inset-x-0 bottom-0 rounded-t-[28px] border border-neutral-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-28px_rgba(28,20,12,0.45)]">
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-neutral-200" />
        <Link href={user?.username ? `/u/${user.username}` : "/settings"} onClick={onClose} className="flex items-center gap-3 rounded-2xl bg-[#fff8ee] px-3 py-3">
          <Avatar name={user?.displayName || "U"} url={user?.avatarUrl} size={52} />
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold">{user?.displayName}</span>
            <span className="block truncate text-sm text-neutral-500">@{user?.username}</span>
          </span>
        </Link>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <Link key={row.href} href={row.href} onClick={onClose} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3.5 last:border-b-0 hover:bg-neutral-50">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-[#c56a00]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{row.label}</span>
                  <span className="block text-xs text-neutral-500">{row.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-sm font-semibold text-white"
          onClick={() => {
            onClose();
            logout();
            router.replace("/");
          }}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { user, badges } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1760px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 px-3 py-4 lg:flex xl:w-[280px]">
          <SideNav />
        </aside>

        <main className="min-h-screen w-full min-w-0 flex-1 border-x border-neutral-200 pb-24 lg:pb-0">{children}</main>
        <RightRail />
      </div>

      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          {phoneTabs.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            const count = link.badge ? badges[link.badge] : 0;
            return (
              <Link key={link.href} href={link.href} className={cn("relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]", active ? "font-semibold text-[#c56a00]" : "text-neutral-500")}>
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                <span>{link.label}</span>
                {count > 0 && <span className="absolute right-[22%] top-1.5 grid min-w-4 place-items-center rounded-full bg-[#ff7a18] px-1 text-[10px] font-semibold leading-4 text-black">{count > 9 ? "9+" : count}</span>}
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Account"
            className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[11px]", accountOpen ? "font-semibold text-[#c56a00]" : "text-neutral-500")}
            onClick={() => setAccountOpen(true)}
          >
            <span className={cn("rounded-full", accountOpen && "ring-2 ring-[#f0a020] ring-offset-2")}>
              <Avatar name={user?.displayName || "U"} url={user?.avatarUrl} size={22} />
            </span>
            <span>You</span>
          </button>
        </div>
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
          <p className="mt-3 text-sm text-neutral-500">No holdings yet. Add one on your profile.</p>
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
        <Link href={user?.username ? `/u/${user.username}?tab=investment` : "/portfolio"} className="mt-4 inline-block text-sm text-[#c56a00]">
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
