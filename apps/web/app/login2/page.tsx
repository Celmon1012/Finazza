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

type StaffStatus = {
  enabled: boolean;
  asAdmin: boolean;
  secretEnabled: boolean;
  staffEmails: string[];
};

function StaffLoginInner() {
  const { setSession, user, ready, logout } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [status, setStatus] = useState<StaffStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function loadAccounts(staffKey?: string) {
    const query = staffKey ? `?key=${encodeURIComponent(staffKey)}` : "";
    const data = await api<{ accounts: StaffAccount[] }>(`/api/auth/staff/accounts${query}`);
    setAccounts(data.accounts);
    setUnlocked(true);
    if (staffKey) {
      sessionStorage.setItem(KEY_STORAGE, staffKey);
      setKey(staffKey);
    }
  }

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await api<StaffStatus>("/api/auth/staff/status");
        if (cancelled) return;
        setStatus(next);
        if (next.asAdmin) {
          await loadAccounts();
          return;
        }
        const fromQuery = search?.get("key") || "";
        const stored = sessionStorage.getItem(KEY_STORAGE) || "";
        const initial = fromQuery || stored;
        if (!initial) return;
        setKey(initial);
        await loadAccounts(initial);
      } catch {
        if (!cancelled) setStatus({ enabled: false, asAdmin: false, secretEnabled: false, staffEmails: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, search, user?.id]);

  async function unlock(nextKey = key) {
    const trimmed = nextKey.trim();
    if (!trimmed) {
      setError("Enter the staff key.");
      return;
    }
    setBusy("unlock");
    setError("");
    try {
      await loadAccounts(trimmed);
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
        body: JSON.stringify({ key: key.trim() || undefined, username }),
      });
      setSession(result.token, result.user);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  const staffEmails = status?.staffEmails?.length ? status.staffEmails : ["ibneyousaf86@gmail.com", "waikintse2@ln.hk"];

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">Staff login</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Switch into demo accounts to post as different people. For site owners only.
      </p>

      {!ready && <Spinner />}

      {ready && status && !status.enabled && !unlocked && (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#fff8ee] px-3 py-3 text-sm text-neutral-700">
          <p>
            Sign in first with a staff email, then open this page again:
          </p>
          <ul className="list-inside list-disc text-[#c56a00]">
            {staffEmails.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
          <Link href="/login" className="inline-flex text-[#c56a00]">
            Go to sign in →
          </Link>
        </div>
      )}

      {ready && status?.asAdmin && unlocked && (
        <p className="mt-3 text-sm text-[#1f9d55]">
          Signed in as staff ({user?.email}). Tap a demo account below.
        </p>
      )}

      {ready && user && !status?.asAdmin && !unlocked && (
        <div className="mt-4 space-y-2 rounded-2xl bg-[#fff0f2] px-3 py-3 text-sm text-[#d6334d]">
          <p>
            You are signed in as {user.email}, which is not a staff owner email.
          </p>
          <button type="button" className="text-[#c56a00]" onClick={() => logout()}>
            Log out and use a staff email
          </button>
        </div>
      )}

      {ready && !unlocked && (status?.secretEnabled || status?.enabled === false) && !status?.asAdmin && (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <p className="text-xs text-neutral-500">Or unlock with the shared staff key (if configured).</p>
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
          <Button type="submit" className="w-full" disabled={busy === "unlock" || !status?.secretEnabled}>
            {busy === "unlock" ? "Checking…" : "Unlock with key"}
          </Button>
          {!status?.secretEnabled && (
            <p className="text-xs text-neutral-500">No staff key is set on the server. Use a staff email instead.</p>
          )}
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
            Hide accounts
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
