"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleButton } from "@/components/google-button";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Me } from "@/lib/types";

function LoginForm() {
  const { setSession, user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(search?.get("error") || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/home");
  }, [ready, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string; user: Me }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(result.token, result.user);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signInFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">{t("auth.signIn")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("auth.signInHint")}</p>
      <div className="mt-6">
        <GoogleButton />
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input className={inputClass} type="email" autoComplete="email" placeholder={t("auth.email")} aria-label={t("auth.email")} value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input className={inputClass} type="password" autoComplete="current-password" placeholder={t("auth.password")} aria-label={t("auth.password")} value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {t("auth.signIn")}
        </Button>
      </form>
      <Link href="/forgot-password" className="mt-3 inline-block text-sm text-[#c56a00]">
        {t("auth.forgotPassword")}
      </Link>
      <p className="mt-6 text-sm text-neutral-500">
        {t("auth.newHere")} <Link href="/register" className="text-[#c56a00]">{t("auth.createAccount")}</Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <h1 className="mt-6 text-3xl font-semibold">Sign in</h1>
        </AuthLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
