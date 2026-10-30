import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const CACHE_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 1_024 * 1_024;

/** Sites often only expose Open Graph tags to known crawlers. */
const CRAWLER_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const cache = new Map<string, { expires: number; value: LinkPreview }>();

function hostLabel(hostname: string) {
  return hostname.replace(/^www\./, "");
}

function titleFromPath(parsed: URL) {
  const segment = parsed.pathname.split("/").filter(Boolean).pop();
  if (!segment) return hostLabel(parsed.hostname);
  try {
    return decodeURIComponent(segment)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return hostLabel(parsed.hostname);
  }
}

function fallbackPreview(url: string): LinkPreview {
  try {
    const parsed = normalizeUrl(url);
    const siteName = hostLabel(parsed.hostname);
    return {
      url: parsed.toString(),
      title: titleFromPath(parsed),
      description: null,
      imageUrl: null,
      siteName,
    };
  } catch {
    return { url, title: null, description: null, imageUrl: null, siteName: null };
  }
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(host: string) {
  const value = host.toLowerCase();
  if (value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("fe80")) return true;
  if (value.startsWith("::ffff:")) return isPrivateIpv4(value.slice(7));
  return false;
}

function isBlockedHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  const version = isIP(host);
  if (version === 4) return isPrivateIpv4(host);
  if (version === 6) return isPrivateIpv6(host);
  return false;
}

async function assertPublicHost(hostname: string) {
  if (isBlockedHost(hostname)) throw new Error("blocked");
  const version = isIP(hostname.replace(/^\[|\]$/g, ""));
  if (version) return;
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length) throw new Error("blocked");
  for (const record of records) {
    if (isBlockedHost(record.address)) throw new Error("blocked");
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function metaContent(html: string, property: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].trim()) : null;
}

function linkHref(html: string, rel: string) {
  const patterns = [
    new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${rel}[^"']*["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function isChallengePage(title: string | null, html: string, hasUsefulOg: boolean) {
  if (hasUsefulOg) return false;
  const heading = (title || "").toLowerCase();
  if (
    heading.includes("attention required") ||
    heading.includes("just a moment") ||
    heading.includes("access denied") ||
    heading === "cloudflare"
  ) {
    return true;
  }
  const head = html.slice(0, 1800).toLowerCase();
  return (
    head.includes("cf-browser-verification") ||
    head.includes("challenge-platform") ||
    (head.includes("attention required!") && head.includes("cloudflare"))
  );
}

function absoluteUrl(base: string, value: string | null) {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function normalizeUrl(raw: string) {
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad url");
  parsed.hash = "";
  return parsed;
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

async function fetchWithAgent(url: string, userAgent: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": userAgent,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parsePreviewHtml(html: string, finalUrl: string, base: LinkPreview): LinkPreview {
  const rawTitle = metaContent(html, "og:title") || pageTitle(html);
  const description = metaContent(html, "og:description") || metaContent(html, "description");
  const imageUrl = absoluteUrl(
    finalUrl,
    metaContent(html, "og:image") ||
      metaContent(html, "twitter:image") ||
      linkHref(html, "image_src") ||
      linkHref(html, "apple-touch-icon"),
  );
  const siteName = metaContent(html, "og:site_name") || base.siteName;
  const challenge = isChallengePage(rawTitle, html, Boolean(imageUrl || description));

  if (challenge) return base;
  if (!rawTitle && !description && !imageUrl) return base;

  return {
    url: finalUrl,
    title: rawTitle || base.title,
    description: description || null,
    imageUrl,
    siteName: siteName || base.siteName,
  };
}

function assetUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

/** When a site blocks our crawlers, Microlink can still return meta + a page screenshot. */
async function enrichWithMicrolink(url: string, current: LinkPreview): Promise<LinkPreview> {
  if (current.imageUrl) return current;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true&screenshot=true`,
      { signal: controller.signal },
    );
    if (!response.ok) return current;
    const body = (await response.json()) as {
      status?: string;
      data?: {
        url?: string;
        title?: string;
        description?: string;
        publisher?: string;
        image?: unknown;
        screenshot?: unknown;
        logo?: unknown;
      };
    };
    if (body.status !== "success" || !body.data) return current;

    const data = body.data;
    const imageUrl = assetUrl(data.image) || assetUrl(data.screenshot) || assetUrl(data.logo);
    return {
      url: typeof data.url === "string" ? data.url : current.url,
      title: data.title || current.title,
      description: data.description || current.description,
      imageUrl: imageUrl || current.imageUrl,
      siteName: data.publisher || current.siteName,
    };
  } catch {
    return current;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPreview(url: string): Promise<LinkPreview> {
  const parsed = normalizeUrl(url);
  await assertPublicHost(parsed.hostname);
  const fallback = fallbackPreview(parsed.toString());
  let best = fallback;

  for (const userAgent of CRAWLER_AGENTS) {
    try {
      const response = await fetchWithAgent(parsed.toString(), userAgent);
      if (!response.ok) continue;

      const finalUrl = new URL(response.url);
      await assertPublicHost(finalUrl.hostname);
      const base = fallbackPreview(finalUrl.toString());

      const type = response.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml\+xml/i.test(type)) continue;

      const html = await readLimitedText(response);
      const parsedPreview = parsePreviewHtml(html, finalUrl.toString(), base);
      if (parsedPreview.imageUrl) return parsedPreview;
      if (parsedPreview.title || parsedPreview.description) best = parsedPreview;
    } catch {
      // try the next crawler identity
    }
  }

  return enrichWithMicrolink(parsed.toString(), best);
}

export async function getLinkPreview(raw: string): Promise<LinkPreview> {
  let parsed: URL;
  try {
    parsed = normalizeUrl(raw);
  } catch {
    return { url: raw, title: null, description: null, imageUrl: null, siteName: null };
  }

  const key = parsed.toString();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  try {
    const value = await fetchPreview(key);
    cache.set(key, { expires: Date.now() + CACHE_MS, value });
    return value;
  } catch {
    const value = await enrichWithMicrolink(key, fallbackPreview(key));
    cache.set(key, { expires: Date.now() + 5 * 60 * 1000, value });
    return value;
  }
}
