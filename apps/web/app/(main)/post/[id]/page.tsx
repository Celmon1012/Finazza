"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Composer, PostCard } from "@/components/post";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { applyPosted, applyRemoved, applyRestored } from "@/lib/posts-sync";
import type { Post } from "@/lib/types";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [error, setError] = useState("");

  function load() {
    return api<{ post: Post; replies: Post[] }>(`/api/posts/${id}`).then((data) => {
      setPost(data.post);
      setReplies(data.replies);
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Post unavailable"));
  }, [id]);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 page-wash border-b border-[#f0e6d8] px-4 py-3">
        <Link href="/home" aria-label="Back">
          <ArrowLeft />
        </Link>
        <h1 className="text-xl font-semibold">Post</h1>
      </header>
      {error && <p className="px-4 py-6 text-sm text-[#ff5d73]">{error}</p>}
      {!post && !error && <Spinner />}
      {post && (
        <PostCard
          post={post}
          onChange={load}
          onRemoved={() => {
            setPost(null);
            router.replace("/home");
          }}
        />
      )}
      <Composer
        replyTo={id}
        placeholder="Post your reply"
        onPosted={(reply, replaceId) => {
          setReplies((current) => applyPosted(current, reply, replaceId));
          if (!replaceId && reply) setPost((current) => (current ? { ...current, replyCount: current.replyCount + 1 } : current));
          if (replaceId && !reply) setPost((current) => (current ? { ...current, replyCount: Math.max(0, current.replyCount - 1) } : current));
        }}
      />
      {replies.map((reply) => (
        <PostCard
          key={reply.id}
          post={reply}
          onRemoved={(replyId) => {
            setReplies((current) => applyRemoved(current, replyId));
            setPost((current) => (current ? { ...current, replyCount: Math.max(0, current.replyCount - 1) } : current));
          }}
          onRestored={(item) => {
            setReplies((current) => applyRestored(current, item));
            setPost((current) => (current ? { ...current, replyCount: current.replyCount + 1 } : current));
          }}
        />
      ))}
    </div>
  );
}
