import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || "dev-only-finazza-change-me";

if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  jwtSecret,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`,
  uploadDir: path.resolve(here, "../uploads"),
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "FINAZZA <noreply@finazza.app>",
  isProd: nodeEnv === "production",
};

export const PROOF_LABEL = "Proof uploaded — not verified by the platform";
export const GROUP_MEMBER_LIMIT = 50;
export const KG_TO_TROY_OZ = 32.1507466;
