"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

export default function LoginPage() {
  const { setSession, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-500">Welcome back to FINAZZA.</p>
      <form className="mt-6 space-y-3" onSubmit={submit}>
        <input className={inputClass} type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input className={inputClass} type="password" autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          Sign in
        </Button>
      </form>
      <Link href="/forgot-password" className="mt-3 inline-block text-sm text-[#c56a00]">
        Forgot password
      </Link>
      <p className="mt-6 text-sm text-neutral-500">
        New here? <Link href="/register" className="text-[#c56a00]">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
