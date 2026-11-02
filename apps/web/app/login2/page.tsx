"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Avatar, Button, inputClass, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Me } from "@/lib/types";

const KEY_STORAGE = "finazza_staff_key";

type StaffAccount = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  blurb: string;
  kind: "staff" | "demo";
  ready: boolean;
};

type StaffStatus = {
  enabled: boolean;
  asAdmin: boolean;
  secretEnabled: boolean;
  staffEmails: string[];
};

function StaffLoginInner() {
  const { setSession, user, ready, logout } = useAuth();
  const { t } = useI18n();
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
      setError(t("staff.enterKey"));
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
      setError(err instanceof Error ? err.message : t("staff.unlockFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function enterAs(account: StaffAccount) {
    if (!account.ready) {
      setError(
        account.kind === "staff"
          ? t("staff.staffMissing", { email: account.email })
          : t("staff.demoMissing"),
      );
      return;
    }
    setBusy(account.id);
    setError("");
    try {
      const result = await api<{ token: string; user: Me }>("/api/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({ key: key.trim() || undefined, id: account.id }),
      });
      setSession(result.token, result.user);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staff.signInFailed"));
      setBusy(null);
    }
  }

  const staffAccounts = accounts.filter((account) => account.kind === "staff");
  const demoAccounts = accounts.filter((account) => account.kind === "demo");
  const staffEmails = status?.staffEmails?.length ? status.staffEmails : ["ibneyousaf86@gmail.com", "waikintse2@ln.hk"];

  function AccountList({ title, items }: { title: string; items: StaffAccount[] }) {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-neutral-400">{title}</p>
        {items.map((account) => (
          <button
            key={account.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => enterAs(account)}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e6d8] bg-white/90 px-3 py-3 text-left transition hover:bg-[#fff8ee] disabled:opacity-50"
          >
            <Avatar name={account.displayName} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{account.displayName}</span>
              <span className="block truncate text-sm text-neutral-500">
                {account.kind === "staff" ? account.email : `@${account.username}`}
                {account.ready ? "" : t("staff.notRegistered")}
              </span>
              <span className="block truncate text-xs text-neutral-400">{account.blurb}</span>
            </span>
            <span className="shrink-0 text-sm text-[#c56a00]">
              {busy === account.id ? "…" : account.ready ? t("staff.enter") : t("staff.missing")}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">{t("staff.title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("staff.hint")}</p>

      {!ready && <Spinner />}

      {ready && status && !status.enabled && !unlocked && (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#fff8ee] px-3 py-3 text-sm text-neutral-700">
          <p>{t("staff.signInFirst")}</p>
          <ul className="list-inside list-disc text-[#c56a00]">
            {staffEmails.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
          <Link href="/login" className="inline-flex text-[#c56a00]">
            {t("staff.goSignIn")}
          </Link>
        </div>
      )}

      {ready && status?.asAdmin && unlocked && (
        <p className="mt-3 text-sm text-[#1f9d55]">{t("staff.signedInAs", { email: user?.email || "" })}</p>
      )}

      {ready && user && !status?.asAdmin && !unlocked && (
        <div className="mt-4 space-y-2 rounded-2xl bg-[#fff0f2] px-3 py-3 text-sm text-[#d6334d]">
          <p>{t("staff.wrongEmail", { email: user.email })}</p>
          <button type="button" className="text-[#c56a00]" onClick={() => logout()}>
            {t("staff.logoutStaff")}
          </button>
        </div>
      )}

      {ready && !unlocked && status?.secretEnabled && !status?.asAdmin && (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <p className="text-xs text-neutral-500">{t("staff.unlockHint")}</p>
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            placeholder={t("staff.key")}
            aria-label={t("staff.key")}
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy === "unlock"}>
            {busy === "unlock" ? t("staff.checking") : t("staff.unlock")}
          </Button>
        </form>
      )}

      {unlocked && (
        <div className="mt-6 space-y-5">
          <AccountList title={t("staff.owners")} items={staffAccounts} />
          <AccountList title={t("staff.demos")} items={demoAccounts} />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <button
            type="button"
            className="text-sm text-neutral-500 hover:text-[#c56a00]"
            onClick={() => {
              sessionStorage.removeItem(KEY_STORAGE);
              setUnlocked(false);
              setAccounts([]);
              setKey("");
              setError("");
            }}
          >
            {t("staff.hide")}
          </button>
        </div>
      )}

      <p className="mt-6 text-sm text-neutral-500">
        {t("staff.publicSignIn")}{" "}
        <Link href="/login" className="text-[#c56a00]">
          /login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function StaffLoginPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <h1 className="mt-6 text-3xl font-semibold">{t("staff.title")}</h1>
          <Spinner />
        </AuthLayout>
      }
    >
      <StaffLoginInner />
    </Suspense>
  );
}
