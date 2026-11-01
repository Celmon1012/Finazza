"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Avatar, Button, inputClass, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

const KEY_STORAGE = "finazza_staff_key";

type StaffAccount = {
  username: string;
  displayName: string;
  blurb: string;
};

function StaffLoginInner() {
  const { setSession, user, ready } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/home");
  }, [ready, user, router]);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/auth/staff/status")
      .then((data) => setEnabled(data.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    const fromQuery = search?.get("key") || "";
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(KEY_STORAGE) || "" : "";
    const initial = fromQuery || stored;
    if (!initial) return;
    setKey(initial);
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ accounts: StaffAccount[] }>(`/api/auth/staff/accounts?key=${encodeURIComponent(initial)}`);
        if (cancelled) return;
        sessionStorage.setItem(KEY_STORAGE, initial);
        setAccounts(data.accounts);
        setUnlocked(true);
      } catch {
        if (!cancelled) sessionStorage.removeItem(KEY_STORAGE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  async function unlock(nextKey = key) {
    const trimmed = nextKey.trim();
    if (!trimmed) {
      setError("Enter the staff key.");
      return;
    }
    setBusy("unlock");
    setError("");
    try {
      const data = await api<{ accounts: StaffAccount[] }>(`/api/auth/staff/accounts?key=${encodeURIComponent(trimmed)}`);
      sessionStorage.setItem(KEY_STORAGE, trimmed);
      setKey(trimmed);
      setAccounts(data.accounts);
      setUnlocked(true);
    } catch (err) {
      sessionStorage.removeItem(KEY_STORAGE);
      setUnlocked(false);
      setAccounts([]);
      setError(err instanceof Error ? err.message : "Could not unlock staff login");
    } finally {
      setBusy(null);
    }
  }

  async function enterAs(username: string) {
    setBusy(username);
    setError("");
    try {
      const result = await api<{ token: string; user: Me }>("/api/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({ key: key.trim(), username }),
      });
      setSession(result.token, result.user);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">Staff login</h1>
      <p className="mt-1 text-sm text-neutral-500">
        One-tap demo accounts for filling the feed. Not linked from the public site.
      </p>

      {enabled === false && (
        <p className="mt-4 rounded-2xl bg-[#fff0f2] px-3 py-2 text-sm text-[#d6334d]">
          Staff login is off. Set <code className="text-xs">STAFF_LOGIN_SECRET</code> on the server (Vercel /{" "}
          <code className="text-xs">apps/api/.env</code>), then redeploy.
        </p>
      )}

      {enabled !== false && !unlocked && (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            placeholder="Staff key"
            aria-label="Staff key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy === "unlock" || enabled === null}>
            {busy === "unlock" ? "Checking…" : "Unlock"}
          </Button>
        </form>
      )}

      {unlocked && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-neutral-400">Tap an account</p>
          {accounts.map((account) => (
            <button
              key={account.username}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => enterAs(account.username)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e6d8] bg-white/90 px-3 py-3 text-left transition hover:bg-[#fff8ee] disabled:opacity-50"
            >
              <Avatar name={account.displayName} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{account.displayName}</span>
                <span className="block truncate text-sm text-neutral-500">
                  @{account.username} · {account.blurb}
                </span>
              </span>
              <span className="shrink-0 text-sm text-[#c56a00]">{busy === account.username ? "…" : "Enter"}</span>
            </button>
          ))}
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <button
            type="button"
            className="mt-2 text-sm text-neutral-500 hover:text-[#c56a00]"
            onClick={() => {
              sessionStorage.removeItem(KEY_STORAGE);
              setUnlocked(false);
              setAccounts([]);
              setKey("");
              setError("");
            }}
          >
            Lock again
          </button>
        </div>
      )}

      <p className="mt-6 text-sm text-neutral-500">
        Public sign-in: <Link href="/login" className="text-[#c56a00]">/login</Link>
      </p>
    </AuthLayout>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <h1 className="mt-6 text-3xl font-semibold">Staff login</h1>
          <Spinner />
        </AuthLayout>
      }
    >
      <StaffLoginInner />
    </Suspense>
  );
}
