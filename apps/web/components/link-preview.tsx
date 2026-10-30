"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, firstUrlInText } from "@/lib/utils";

type Preview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const memory = new Map<string, Preview>();
const inflight = new Map<string, Promise<Preview>>();

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function titleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    if (!segment) return domainOf(url);
    return decodeURIComponent(segment)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return domainOf(url);
  }
}

function fallbackPreview(url: string): Preview {
  return {
    url,
    title: titleFromUrl(url),
    description: null,
    imageUrl: null,
    siteName: domainOf(url),
  };
}

async function loadPreview(url: string, force = false) {
  const cached = memory.get(url);
  if (!force && cached?.imageUrl) return cached;
  const pending = inflight.get(url);
  if (pending) return pending;

  const request = api<Preview>(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then((data) => {
      const base = fallbackPreview(url);
      const value: Preview = {
        url: data.url || base.url,
        title: data.title || base.title,
        description: data.description,
        imageUrl: data.imageUrl,
        siteName: data.siteName || base.siteName,
      };
      memory.set(url, value);
      inflight.delete(url);
      return value;
    })
    .catch(() => {
      const value = cached || fallbackPreview(url);
      memory.set(url, value);
      inflight.delete(url);
      return value;
    });

  inflight.set(url, request);
  return request;
}

export function LinkPreview({ text, className }: { text: string; className?: string }) {
  const found = firstUrlInText(text);
  const [url, setUrl] = useState(found);
  const [preview, setPreview] = useState<Preview | null>(() => {
    if (!found) return null;
    return memory.get(found) || fallbackPreview(found);
  });
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    if (found === url) return;
    if (!found) {
      setUrl(null);
      setPreview(null);
      return;
    }
    if (memory.has(found)) {
      setUrl(found);
      return;
    }
    setPreview(fallbackPreview(found));
    const timer = window.setTimeout(() => setUrl(found), 400);
    return () => window.clearTimeout(timer);
  }, [found, url]);

  useEffect(() => {
    let cancelled = false;
    setImageBroken(false);
    if (!url) {
      setPreview(null);
      return;
    }
    const cached = memory.get(url);
    if (cached) setPreview(cached);
    else setPreview(fallbackPreview(url));
    loadPreview(url, Boolean(cached && !cached.imageUrl)).then((data) => {
      if (!cancelled) setPreview(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || !preview) return null;

  const href = preview.url || url;
  const title = preview.title || preview.siteName || domainOf(href);
  const site = preview.siteName || domainOf(href);
  const showImage = Boolean(preview.imageUrl) && !imageBroken;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "mt-3 block overflow-hidden rounded-2xl border border-[#f0e6d8] bg-white/80 transition hover:bg-white",
        className,
      )}
    >
      {showImage ? (
        <img
          src={preview.imageUrl!}
          alt=""
          className="aspect-[1.91/1] w-full bg-[#fff4e0] object-cover object-top"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <div className="flex aspect-[2.4/1] items-center justify-center bg-gradient-to-br from-[#fff4e0] to-[#f7efe2] text-[#c56a00]">
          <Link2 className="h-8 w-8" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 px-3 py-2.5">
        <p className="truncate text-xs uppercase tracking-[0.12em] text-neutral-500">{site}</p>
        <p className="line-clamp-2 text-sm font-semibold text-neutral-950">{title}</p>
        {preview.description && <p className="line-clamp-2 text-sm text-neutral-500">{preview.description}</p>}
      </div>
    </a>
  );
}
