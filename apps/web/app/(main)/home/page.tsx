"use client";

import { useEffect, useState } from "react";
import { Composer, PostCard } from "@/components/post";
import { PageHeader } from "@/components/shell";
import { Button, Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { applyPosted, applyRemoved, applyRestored, isPendingPost } from "@/lib/posts-sync";
import type { Post } from "@/lib/types";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextPage = 1) {
    const data = await api<{ posts: Post[]; hasMore: boolean }>(`/api/posts/feed?tab=following&page=${nextPage}`);
    setPosts((current) => {
      const pending = current.filter(isPendingPost);
      const next = nextPage === 1 ? data.posts : [...current.filter((item) => !isPendingPost(item)), ...data.posts];
      if (nextPage !== 1) return next;
      const seen = new Set(next.map((item) => item.id));
      return [...pending.filter((item) => !seen.has(item.id)), ...next];
    });
    setHasMore(data.hasMore);
    setPage(nextPage);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the feed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Home" subtitle="People you follow" />
      <Composer onPosted={(post, replaceId) => setPosts((current) => applyPosted(current, post, replaceId))} />
      {loading && <Spinner />}
      {error && <p className="px-4 py-6 text-sm text-[#ff5d73]">{error}</p>}
      {!loading && posts.length === 0 && <Empty title="Your feed is quiet" body="Follow Alex, Jordan, or Sam from Explore, or publish the first note yourself." />}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onChange={() => load(1)}
          onRemoved={(id) => setPosts((current) => applyRemoved(current, id))}
          onRestored={(item) => setPosts((current) => applyRestored(current, item))}
        />
      ))}
      {hasMore && (
        <div className="p-4">
          <Button variant="ghost" onClick={() => load(page + 1)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
