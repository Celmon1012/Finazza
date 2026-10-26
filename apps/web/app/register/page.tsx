"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

export default function RegisterPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "", acceptedTerms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
      setError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 py-10">
      <div className="w-full">
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold">Create your account</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <Field label="Display name">
            <input className={inputClass} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
          </Field>
          <Field label="Username">
            <input className={inputClass} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} required />
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </Field>
          <label className="flex items-start gap-2 text-sm text-neutral-600">
            <input type="checkbox" className="mt-1" checked={form.acceptedTerms} onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })} required />
            <span>
              I agree to the <Link href="/terms" className="text-[#c56a00]">terms</Link>. I understand posts are not financial advice and proof is not verified.
            </span>
          </label>
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !form.acceptedTerms}>
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-neutral-500">
          Already registered? <Link href="/login" className="text-[#c56a00]">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
