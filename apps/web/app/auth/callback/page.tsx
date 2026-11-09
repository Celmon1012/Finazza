"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Me } from "@/lib/types";

function CallbackInner() {
  const { setSession } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const code = search?.get("code") || "";
  const errorParam = search?.get("error") || "";
  const [error, setError] = useState(/currently suspended/i.test(errorParam) ? t("auth.suspended") : errorParam);

  useEffect(() => {
    if (errorParam) return;
    if (!code) {
      setError(t("auth.googleIncomplete"));
      return;
    }
    let cancelled = false;
    api<{ token: string; user: Me }>("/api/auth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then((result) => {
        if (cancelled) return;
        setSession(result.token, result.user);
        router.replace("/home");
      })
      .catch((err) => {
        if (!cancelled) {
          const raw = err instanceof Error ? err.message : "";
          setError(/currently suspended/i.test(raw) ? t("auth.suspended") : raw || t("auth.googleFailed"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, errorParam, router, setSession, t]);

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">{t("auth.signingIn")}</h1>
      {error ? (
        <>
          <p className="mt-3 text-sm text-[#ff5d73]">{error}</p>
          <p className="mt-6 text-sm text-neutral-500">
            <Link href="/login" className="text-[#c56a00]">
              {t("auth.backToSignIn")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-500">{t("auth.finishingGoogle")}</p>
          <Spinner />
        </>
      )}
    </AuthLayout>
  );
}

export default function GoogleCallbackPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <h1 className="mt-6 text-3xl font-semibold">{t("auth.signingIn")}</h1>
          <Spinner />
        </AuthLayout>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
