const configured = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const unusable =
  !configured ||
  configured.includes("YOUR-API-URL") ||
  configured.includes("localhost") ||
  configured.includes("127.0.0.1");

export const API_URL = process.env.NODE_ENV === "production" && unusable ? "" : configured || "http://localhost:4000";
export const TOKEN_KEY = "finazza_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const headers = new Headers(options.headers);
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isForm && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/api/auth/login") &&
      !path.startsWith("/api/auth/register")
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("finazza:unauthorized"));
    }
    throw new ApiError(response.status, data.error || "Request failed");
  }
  return data as T;
}
