"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

function CallbackInner() {
  const { setSession } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const code = search?.get("code") || "";
  const errorParam = search?.get("error") || "";
  const [error, setError] = useState(errorParam);

  useEffect(() => {
    if (errorParam) return;
    if (!code) {
      setError("Google sign-in was incomplete.");
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
        if (!cancelled) setError(err instanceof Error ? err.message : "Google sign-in failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [code, errorParam, router, setSession]);

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">Signing you in</h1>
      {error ? (
        <>
          <p className="mt-3 text-sm text-[#ff5d73]">{error}</p>
          <p className="mt-6 text-sm text-neutral-500">
            <Link href="/login" className="text-[#c56a00]">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-500">Finishing Google sign-in…</p>
          <Spinner />
        </>
      )}
    </AuthLayout>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <h1 className="mt-6 text-3xl font-semibold">Signing you in</h1>
          <Spinner />
        </AuthLayout>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
