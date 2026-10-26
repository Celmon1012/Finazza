import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { config } from "./config.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

function publicUrl(filename: string) {
  return `/uploads/${filename}`;
}

async function writeBuffer(filename: string, buffer: Buffer) {
  await ensureUploadDir();
  await fs.writeFile(path.join(config.uploadDir, filename), buffer);
  return publicUrl(filename);
}

/** Re-encode images so EXIF and other metadata are dropped. */
export async function saveImage(buffer: Buffer) {
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
  return { url: await writeBuffer(filename, out), mimeType: "image/webp" };
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
  return { url: await writeBuffer(filename, Buffer.from(bytes)), mimeType: "application/pdf" };
}

export async function saveUpload(buffer: Buffer, mimeType: string, allowPdf: boolean) {
  if (IMAGE_TYPES.has(mimeType)) return saveImage(buffer);
  if (allowPdf && mimeType === "application/pdf") return savePdf(buffer);
  throw new Error(allowPdf ? "Upload an image or PDF" : "Upload an image");
}

export async function saveSvgImage(svg: string) {
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return saveImage(buffer);
}

export async function deletePublicFile(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filename = path.basename(url);
  await fs.unlink(path.join(config.uploadDir, filename)).catch(() => undefined);
}
