import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { ZodError } from "zod";
import { config } from "./config.js";
import { HttpError } from "./http.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import investmentRoutes from "./routes/investments.js";
import metaRoutes from "./routes/meta.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (
    origin === config.clientOrigin ||
    origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:3000" ||
    origin === "https://finazza.vercel.app"
  ) {
    return true;
  }
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    }),
  );
  app.use("/api", (_req, res, next) => {
    if (config.isProd && (!process.env.JWT_SECRET || !config.supabaseUrl || !config.supabaseSecretKey)) {
      res.status(500).json({ error: "The server is missing Supabase or JWT settings." });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(config.uploadDir, { fallthrough: false, maxAge: "7d" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "finazza-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/investments", investmentRoutes);
  app.use("/api/conversations", chatRoutes);
  app.use("/api", metaRoutes);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || "Check the form and try again" });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Files must be 8 MB or smaller" : error.message });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof Error && /image|pdf|upload|sharp|bucket|storage|heif|photo/i.test(error.message)) {
      res.status(400).json({ error: error.message.slice(0, 200) });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
