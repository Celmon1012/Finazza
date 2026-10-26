"use client";

import { mediaUrl } from "@/lib/api";
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
