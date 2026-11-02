"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleButton } from "@/components/google-button";
import { Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Me } from "@/lib/types";
import { cn } from "@/lib/utils";

function NameHelp() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className="grid h-5 w-5 place-items-center rounded-full text-neutral-500 hover:text-[#c56a00]"
        aria-label={t("auth.nameHelpAria")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={18} />
      </button>
      {open && (
        <div id={panelId} role="note" className="absolute left-0 top-7 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700 shadow-[0_18px_50px_-28px_rgba(28,20,12,0.45)]">
          <p>{t("auth.nameHelpUsername")}</p>
          <p className="mt-3">{t("auth.nameHelpDisplay")}</p>
          <p className="mt-3 text-neutral-500">{t("auth.nameHelpExample")}</p>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { setSession } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "", acceptedTerms: false });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== form.password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (confirmPassword !== form.password) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string; user: Me }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSession(result.token, result.user);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registerFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mt-6 text-3xl font-semibold">{t("auth.registerTitle")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("auth.registerHintGoogle")}</p>
        <div className="mt-6">
          <GoogleButton />
        </div>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <label htmlFor="display-name">{t("auth.displayName")}</label>
              <NameHelp />
            </div>
            <input id="display-name" className={inputClass} maxLength={40} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
          </div>
          <div className="space-y-1.5 text-sm">
            <label htmlFor="username" className="text-neutral-600">
              {t("auth.username")}
            </label>
            <input
              id="username"
              className={inputClass}
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_]{3,20}"
              title={t("auth.usernameTitle")}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
              required
            />
            <p className="text-xs leading-5 text-neutral-500">{t("auth.usernameHint")}</p>
          </div>
          <Field label={t("auth.email")}>
            <input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field label={t("auth.password")}>
            <input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </Field>
          <div className="space-y-1.5 text-sm">
            <label htmlFor="confirm-password" className="text-neutral-600">
              {t("auth.confirmPassword")}
            </label>
            <input
              id="confirm-password"
              className={cn(inputClass, mismatch && "border-[#ff5d73]")}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={mismatch}
              required
            />
            {mismatch ? (
              <p className="text-xs text-[#ff5d73]">{t("auth.passwordMismatchDot")}</p>
            ) : confirmPassword && confirmPassword === form.password ? (
              <p className="text-xs text-[#1f9d55]">{t("auth.passwordMatch")}</p>
            ) : (
              <p className="text-xs text-neutral-500">{t("auth.passwordRetype")}</p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm text-neutral-600">
            <input type="checkbox" className="mt-1" checked={form.acceptedTerms} onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })} required />
            <span>
              {t("auth.acceptTermsLead")}{" "}
              <Link href="/terms" className="text-[#c56a00]">
                {t("auth.terms")}
              </Link>{" "}
              {t("auth.acceptTermsMid")}{" "}
              <Link href="/privacy" className="text-[#c56a00]">
                {t("auth.privacy")}
              </Link>
              {t("auth.acceptTermsTail")}
            </span>
          </label>
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !form.acceptedTerms || mismatch}>
            {t("auth.create")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-neutral-500">
          {t("auth.alreadyRegistered")}{" "}
          <Link href="/login" className="text-[#c56a00]">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
