import { config } from "./config.js";
import { sb } from "./supabase.js";

export async function connectDb() {
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required. Add them to apps/api/.env.");
  }
  const { error } = await sb().from("profiles").select("id").limit(1);
  if (error) {
    const missing = error.code === "PGRST205" || /schema cache/i.test(error.message);
    throw new Error(
      missing
        ? "Supabase tables are missing. Run apps/api/supabase/schema.sql in the Supabase SQL editor."
        : `Supabase connection failed: ${error.message}`,
    );
  }
  console.log("Supabase connected");
}

export async function disconnectDb() {}
