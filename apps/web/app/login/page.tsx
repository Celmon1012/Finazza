"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

const demos = [
  ["alex@finazza.dev", "Portfolio snapshot"],
  ["jordan@finazza.dev", "Charts and messages"],
  ["sam@finazza.dev", "Collectibles"],
  ["admin@finazza.dev", "Moderation"],
];

export default function LoginPage() {
  const { setSession, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("alex@finazza.dev");
  const [password, setPassword] = useState("password123");
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
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6">
      <div className="w-full">
        <Link href="/" aria-label="FINAZZA home">
          <Logo />
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">Sign in</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
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
        <div className="mt-6 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm font-semibold">Demo accounts</p>
          <p className="mb-3 text-xs text-neutral-500">Password for each: password123</p>
          <div className="space-y-2">
            {demos.map(([account, note]) => (
              <button key={account} type="button" className="block w-full rounded-xl px-2 py-1.5 text-left text-sm hover:bg-neutral-100" onClick={() => setEmail(account)}>
                {account}
                <span className="block text-xs text-neutral-500">{note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
