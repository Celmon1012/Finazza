"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ message: string; devResetUrl?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
      setResetUrl(result.devResetUrl || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetFailed"));
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mt-6 text-3xl font-semibold">{t("auth.resetTitle")}</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <input className={inputClass} type="email" autoComplete="email" placeholder={t("auth.email")} aria-label={t("auth.email")} value={email} onChange={(event) => setEmail(event.target.value)} required />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          {message && <p className="text-sm text-[#3dd68c]">{message}</p>}
          {resetUrl && (
            <Link href={resetUrl.replace(/^https?:\/\/[^/]+/, "")} className="block text-sm text-[#c56a00]">
              {t("auth.resetDevLink")}
            </Link>
          )}
          <Button type="submit" className="w-full">
            {t("auth.resetSend")}
          </Button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-[#c56a00]">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    </AuthLayout>
  );
}
