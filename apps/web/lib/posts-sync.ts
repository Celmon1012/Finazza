import type { Post } from "./types";

/** Top-level timeline posts only — replies belong under the parent. */
export function isFeedPost(post: Post) {
  return !post.replyTo;
}

export function onlyFeedPosts(posts: Post[]) {
  return posts.filter(isFeedPost);
}

/** Apply Composer onPosted updates (pending insert, confirm replace, or rollback). */
export function applyPosted(current: Post[], post: Post | null, replaceId?: string): Post[] {
  if (replaceId && !post) return current.filter((item) => item.id !== replaceId);
  if (replaceId && post) {
    if (!isFeedPost(post)) return current.filter((item) => item.id !== replaceId);
    return current.map((item) => (item.id === replaceId ? post : item));
  }
  if (post && !isFeedPost(post)) return current;
  return post ? [post, ...current.filter((item) => item.id !== post.id)] : current;
}

export function applyRemoved(current: Post[], id: string): Post[] {
  return current.filter((item) => item.id !== id);
}

/** Put a post back after a failed optimistic delete. */
export function applyRestored(current: Post[], post: Post): Post[] {
  if (current.some((item) => item.id === post.id)) return current;
  return [post, ...current];
}

export function isPendingPost(post: Post) {
  return post.id.startsWith("pending-");
}
