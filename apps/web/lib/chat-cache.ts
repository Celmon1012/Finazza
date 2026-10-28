import { api } from "./api";
import type { ChatMessage } from "./types";

const FRESH_MS = 20_000;
const cache = new Map<string, { messages: ChatMessage[]; at: number }>();
const requests = new Map<string, Promise<ChatMessage[]>>();

export function cachedMessages(id: string) {
  return cache.get(id)?.messages;
}

export function rememberMessages(id: string, messages: ChatMessage[]) {
  cache.set(id, { messages, at: Date.now() });
}

/** Loads a room's messages, sharing one request if a load is already running. */
export function fetchMessages(id: string) {
  const pending = requests.get(id);
  if (pending) return pending;
  const task = api<{ messages: ChatMessage[] }>(`/api/conversations/${id}/messages`)
    .then((data) => {
      cache.set(id, { messages: data.messages, at: Date.now() });
      return data.messages;
    })
    .finally(() => {
      if (requests.get(id) === task) requests.delete(id);
    });
  requests.set(id, task);
  return task;
}

/** Fetches a room's messages ahead of a click, and skips rooms fetched moments ago. */
export function prefetchMessages(id: string) {
  if (!id) return;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return;
  fetchMessages(id).catch(() => undefined);
}
