import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";
import { config } from "./config.js";
import { HttpError } from "./http.js";
import { sb } from "./supabase.js";

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

function sniffImage(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString() === "GIF87a" || buffer.subarray(0, 6).toString() === "GIF89a")) {
    return { ext: "gif", mime: "image/gif" };
  }
  return null;
}

function isHeic(buffer: Buffer) {
  return buffer.length >= 12 && buffer.subarray(4, 8).toString() === "ftyp" && /heic|heif|mif1/i.test(buffer.subarray(8, 16).toString());
}

const AUDIO_FILE = /\.(webm|ogg|m4a|mp3|wav)$/i;

/** Chat messages keep voice recordings in the same column as images, so the file extension tells them apart. */
export function isAudioUrl(url: string | null | undefined) {
  return Boolean(url && AUDIO_FILE.test(url.split("?")[0]));
}

function sniffAudio(buffer: Buffer) {
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { ext: "webm", mime: "audio/webm" };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === "OggS") return { ext: "ogg", mime: "audio/ogg" };
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString() === "ftyp" && !isHeic(buffer)) return { ext: "m4a", mime: "audio/mp4" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE") {
    return { ext: "wav", mime: "audio/wav" };
  }
  if (buffer.length >= 3 && (buffer.subarray(0, 3).toString() === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))) {
    return { ext: "mp3", mime: "audio/mpeg" };
  }
  return null;
}

export async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

const BUCKET = "finazza-uploads";

function publicUrl(filename: string) {
  return `/uploads/${filename}`;
}

/** Local disk paths and this project's public storage URLs are the only image addresses a post or chat may keep. */
export function isStoredFileUrl(url: string) {
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)) return true;
  if (!config.supabaseUrl) return false;
  try {
    const file = new URL(url);
    const base = new URL(config.supabaseUrl);
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    const name = file.pathname.slice(prefix.length);
    return file.protocol === "https:" && file.host === base.host && file.pathname.startsWith(prefix) && /^[A-Za-z0-9._-]+$/.test(name);
  } catch {
    return false;
  }
}

let bucketReady: Promise<void> | null = null;

function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const existing = await sb().storage.getBucket(BUCKET);
      if (!existing.error) return;
      const created = await sb().storage.createBucket(BUCKET, { public: true });
      if (created.error && !/already exists/i.test(created.error.message)) {
        bucketReady = null;
        throw new Error(created.error.message);
      }
    })();
  }
  return bucketReady;
}

async function writeBuffer(filename: string, buffer: Buffer, mimeType: string) {
  if (config.supabaseUrl && config.supabaseSecretKey) {
    await ensureBucket();
    const { error } = await sb().storage.from(BUCKET).upload(filename, buffer, { contentType: mimeType, upsert: false });
    if (error) throw new Error(error.message);
    return sb().storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
  }
  await ensureUploadDir();
  await fs.writeFile(path.join(config.uploadDir, filename), buffer);
  return publicUrl(filename);
}

async function saveImageWithSharp(buffer: Buffer) {
  const sharp = await loadSharp();
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("The image could not be read");
  }
  const out = await image
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const filename = `${randomUUID()}.webp`;
  return { url: await writeBuffer(filename, out, "image/webp"), mimeType: "image/webp" };
}

/** Re-encode images so EXIF and other metadata are dropped. */
export async function saveImage(buffer: Buffer) {
  try {
    return await saveImageWithSharp(buffer);
  } catch (error) {
    if (isHeic(buffer)) throw new Error("Use a JPEG or PNG photo");
    const kind = sniffImage(buffer);
    if (!kind) throw error;
    const filename = `${randomUUID()}.${kind.ext}`;
    return { url: await writeBuffer(filename, buffer, kind.mime), mimeType: kind.mime };
  }
}

/** Copy PDF pages into a new document so source metadata is not kept. */
export async function savePdf(buffer: Buffer) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: false, updateMetadata: false });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((page) => out.addPage(page));
  out.setTitle("FINAZZA proof");
  out.setAuthor("");
  out.setProducer("FINAZZA");
  out.setCreator("");
  const bytes = await out.save();
  const filename = `${randomUUID()}.pdf`;
  return { url: await writeBuffer(filename, Buffer.from(bytes), "application/pdf"), mimeType: "application/pdf" };
}

export async function saveUpload(buffer: Buffer, mimeType: string, allowPdf: boolean) {
  const mime = mimeType === "image/jpg" || mimeType === "image/pjpeg" ? "image/jpeg" : mimeType;
  if (IMAGE_TYPES.has(mime) || sniffImage(buffer) || isHeic(buffer)) return saveImage(buffer);
  if (allowPdf && mime === "application/pdf") return savePdf(buffer);
  throw new Error(allowPdf ? "Upload an image or PDF" : "Upload an image");
}

/** The length is kept in the file name because recorded WebM files do not report it until fully downloaded. */
export async function saveAudio(buffer: Buffer, seconds?: number) {
  const kind = sniffAudio(buffer);
  if (!kind) throw new HttpError(400, "That voice recording could not be read. Try recording again.");
  const length = seconds && Number.isFinite(seconds) ? `-${Math.min(600, Math.max(1, Math.round(seconds)))}s` : "";
  const filename = `${randomUUID()}${length}.${kind.ext}`;
  return { url: await writeBuffer(filename, buffer, kind.mime), mimeType: kind.mime };
}

export async function saveSvgImage(svg: string) {
  const sharp = await loadSharp();
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return saveImage(buffer);
}

export async function deletePublicFile(url: string | null | undefined) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const remote = url.indexOf(marker);
  if (remote !== -1) {
    const filename = decodeURIComponent(url.slice(remote + marker.length).split("?")[0]);
    await sb().storage.from(BUCKET).remove([filename]);
    return;
  }
  if (!url.startsWith("/uploads/")) return;
  const filename = path.basename(url);
  await fs.unlink(path.join(config.uploadDir, filename)).catch(() => undefined);
}
