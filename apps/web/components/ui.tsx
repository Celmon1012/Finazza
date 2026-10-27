"use client";

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  const styles = {
    primary: "gold-fill font-semibold",
    ghost: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
    outline: "border border-neutral-300 text-neutral-900 hover:bg-neutral-100",
    danger: "bg-[#ff5d73] text-white hover:brightness-110",
  }[variant];
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition disabled:opacity-50", styles, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 placeholder:text-neutral-400";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-neutral-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffc14d] border-t-transparent" />
      {label}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{body}</p>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0" aria-label="Close dialog" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 shadow-glow">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-sm text-neutral-500" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AvatarPicker({
  name,
  url,
  size = 72,
  onChange,
}: {
  name: string;
  url?: string | null;
  size?: number;
  onChange: (avatarUrl: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: { avatarUrl: string | null } }>("/api/users/me/avatar", { method: "DELETE" });
      onChange(result.user.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the photo");
    } finally {
      setBusy(false);
    }
  }

  async function pick(file: File) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api<{ user: { avatarUrl: string | null } }>("/api/users/me/avatar", { method: "POST", body: form });
      if (result.user.avatarUrl) onChange(result.user.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Avatar name={name} url={url} size={size} />
        <label aria-label="Upload photo" className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-300 hover:bg-neutral-100 sm:w-auto sm:gap-2 sm:px-4">
          <Camera size={18} />
          <span className="sr-only sm:not-sr-only sm:text-sm">{busy ? "Working…" : "Upload photo"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) pick(file).catch(() => undefined);
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            aria-label="Remove photo"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 hover:text-[#ff5d73] disabled:opacity-50 sm:w-auto sm:gap-2 sm:px-4"
            disabled={busy}
            onClick={() => remove().catch(() => undefined)}
          >
            <X size={18} />
            <span className="sr-only sm:not-sr-only sm:text-sm">Remove photo</span>
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-[#ff5d73]">{error}</p>}
    </div>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const letter = (name || "?").slice(0, 1).toUpperCase();
  if (url) {
    return <img src={mediaUrl(url)} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff7a18] to-[#5c3b16] text-sm font-semibold text-[#1a1004]"
      style={{ width: size, height: size }}
    >
      {letter}
    </span>
  );
}
