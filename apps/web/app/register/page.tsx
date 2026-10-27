"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

function NameHelp() {
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
        aria-label="Difference between display name and username"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={18} />
      </button>
      {open && (
        <div id={panelId} role="note" className="absolute left-0 top-7 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700 shadow-[0_18px_50px_-28px_rgba(28,20,12,0.45)]">
          <p>
            A <span className="font-semibold text-neutral-950">username</span> is your unique handle, like @james_zhang. Only one account can have it. People use it to @mention you, and it is the address of your profile.
          </p>
          <p className="mt-3">
            A <span className="font-semibold text-neutral-950">display name</span> is the friendly name shown in bold, like James Zhang. It does not have to be unique, so it can include spaces and emoji. You can change it later in Settings. It can be up to 40 characters.
          </p>
          <p className="mt-3 text-neutral-500">For example, Alex Morgan is the display name and @alex is the username.</p>
        </div>
      )}
    </div>
  );
}

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
        <Link href="/" aria-label="FINAZZA home">
          <Logo />
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">Create your account</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <label htmlFor="display-name">Display name</label>
              <NameHelp />
            </div>
            <input id="display-name" className={inputClass} maxLength={40} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
          </div>
          <div className="space-y-1.5 text-sm">
            <label htmlFor="username" className="text-neutral-600">Username</label>
            <input
              id="username"
              className={inputClass}
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_]{3,20}"
              title="3–20 characters: lowercase letters, numbers, or underscores"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
              required
            />
            <p className="text-xs leading-5 text-neutral-500">
              3–20 characters. Letters, numbers, and underscores only. No spaces. It is saved in lowercase and has to be unique. Reserved names such as admin, support, and finazza are not available.
            </p>
          </div>
          <Field label="Email">
            <input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </Field>
          <label className="flex items-start gap-2 text-sm text-neutral-600">
            <input type="checkbox" className="mt-1" checked={form.acceptedTerms} onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })} required />
            <span>
              I agree to the <Link href="/terms" className="text-[#c56a00]">Terms of Use</Link> and <Link href="/privacy" className="text-[#c56a00]">Privacy Policy</Link>. I understand posts are not financial advice and proof is not verified.
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
