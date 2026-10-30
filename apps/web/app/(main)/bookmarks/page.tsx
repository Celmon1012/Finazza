"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post";
import { PageHeader } from "@/components/shell";
import { Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { applyRemoved, applyRestored } from "@/lib/posts-sync";
import type { Post } from "@/lib/types";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ posts: Post[] }>("/api/posts/bookmarks")
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load bookmarks"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Bookmarks" subtitle="Posts you saved. Only you can see this list." />
      {loading && <Spinner />}
      {error && <p className="px-4 py-6 text-sm text-[#ff5d73]">{error}</p>}
      {!loading && posts.length === 0 && <Empty title="No bookmarks yet" body="Tap the bookmark on a post to save it here." />}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onBookmark={(saved) => {
            if (!saved) setPosts((current) => current.filter((item) => item.id !== post.id));
          }}
          onRemoved={(id) => setPosts((current) => applyRemoved(current, id))}
          onRestored={(item) => setPosts((current) => applyRestored(current, item))}
        />
      ))}
    </div>
  );
}
