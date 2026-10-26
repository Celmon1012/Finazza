"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, inputClass, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6">
      <div className="w-full">
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold">Choose a new password</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <input className={inputClass} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          {!token && <p className="text-sm text-[#ff5d73]">This reset link is missing a token.</p>}
          <Button type="submit" disabled={!token}>
            Update password
          </Button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-[#c56a00]">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetForm />
    </Suspense>
  );
}
