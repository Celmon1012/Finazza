"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button, inputClass } from "@/components/ui";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
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
      setError(err instanceof Error ? err.message : "Could not start a reset");
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mt-6 text-3xl font-semibold">Reset password</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <input className={inputClass} type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
          {message && <p className="text-sm text-[#3dd68c]">{message}</p>}
          {resetUrl && (
            <Link href={resetUrl.replace(/^https?:\/\/[^/]+/, "")} className="block text-sm text-[#c56a00]">
              Open the development reset link
            </Link>
          )}
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-[#c56a00]">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
