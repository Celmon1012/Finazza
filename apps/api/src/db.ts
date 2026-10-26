import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "./config.js";

async function reportSupabase() {
  if (!config.supabaseUrl || !config.supabasePublishableKey) return;
  const response = await fetch(`${config.supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`,
    },
  }).catch(() => null);
  if (!response) {
    console.warn("Supabase project could not be reached.");
    return;
  }
  if (response.ok) {
    console.log("Supabase tables are present. The API still uses MongoDB until SUPABASE_SECRET_KEY is set and the data layer is pointed at Postgres.");
    return;
  }
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  if (body.code === "PGRST205") {
    console.warn("Supabase is reachable, but tables are missing. Run apps/api/supabase/schema.sql in the Supabase SQL editor.");
    return;
  }
  console.warn(`Supabase check failed (${response.status}): ${body.message || "unknown error"}`);
}

let memory: MongoMemoryServer | null = null;

export async function connectDb() {
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected (external)");
    await reportSupabase();
    return;
  }

  const dbPath = path.join(config.dataDir, "db");
  fs.mkdirSync(dbPath, { recursive: true });
  memory = await MongoMemoryServer.create({
    instance: {
      dbName: "finazza",
      dbPath,
      storageEngine: "wiredTiger",
    },
  });
  await mongoose.connect(memory.getUri(), { dbName: "finazza" });
  console.log("MongoDB connected (embedded, persistent in apps/api/data)");
  await reportSupabase();
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memory) {
    await memory.stop({ doCleanup: false, force: false });
    memory = null;
  }
}
