import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const file of [
  path.resolve(here, "../.env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), "../api/.env"),
]) {
  dotenv.config({ path: file });
}

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || "dev-only-finazza-change-me";
const vercelHost = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").replace(/^https?:\/\//, "");
const hostedOrigin = vercelHost ? `https://${vercelHost}` : "";

function publicUrl(value: string | undefined, fallback: string) {
  if (!value || value.includes("YOUR-VERCEL") || value.includes("YOUR-API")) return fallback;
  return value;
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  jwtSecret,
  clientOrigin: publicUrl(process.env.CLIENT_ORIGIN, hostedOrigin || "http://localhost:3000"),
  appUrl: publicUrl(process.env.APP_URL, hostedOrigin || "http://localhost:3000"),
  apiPublicUrl: publicUrl(process.env.API_PUBLIC_URL, hostedOrigin || `http://localhost:${process.env.PORT || 4000}`),
  uploadDir: path.resolve(here, "../uploads"),
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "FINAZZA <noreply@finazza.app>",
  isProd: nodeEnv === "production",
};

export const PROOF_LABEL = "Proof uploaded — not verified by the platform";
export const GROUP_MEMBER_LIMIT = 50;
export const KG_TO_TROY_OZ = 32.1507466;
