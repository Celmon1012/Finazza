import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";
import { config } from "./config.js";
import { sb } from "./supabase.js";

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

const BUCKET = "finazza-uploads";

function publicUrl(filename: string) {
  return `/uploads/${filename}`;
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

/** Re-encode images so EXIF and other metadata are dropped. */
export async function saveImage(buffer: Buffer) {
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
  if (IMAGE_TYPES.has(mimeType)) return saveImage(buffer);
  if (allowPdf && mimeType === "application/pdf") return savePdf(buffer);
  throw new Error(allowPdf ? "Upload an image or PDF" : "Upload an image");
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
