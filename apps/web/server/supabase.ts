import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let client: SupabaseClient | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();
  const attempts = method === "GET" || method === "HEAD" ? 3 : 1;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= attempts) throw error;
      await wait(250 * attempt);
    }
  }
}

export function sb() {
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required in apps/api/.env");
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithRetry },
    });
  }
  return client;
}

export function table(name: string) {
  return sb().from(name) as any;
}

export function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
