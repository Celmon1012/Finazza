"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Composer, PostCard } from "@/components/post";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [error, setError] = useState("");

  function load() {
    return api<{ post: Post; replies: Post[] }>(`/api/posts/${params.id}`).then((data) => {
      setPost(data.post);
      setReplies(data.replies);
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Post unavailable"));
  }, [params.id]);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/home" aria-label="Back">
          <ArrowLeft />
        </Link>
        <h1 className="text-xl font-semibold">Post</h1>
      </header>
      {error && <p className="px-4 py-6 text-sm text-[#ff5d73]">{error}</p>}
      {!post && !error && <Spinner />}
      {post && <PostCard post={post} onChange={load} />}
      <Composer replyTo={params.id} placeholder="Post your reply" onPosted={(reply) => setReplies((current) => [...current, reply])} />
      {replies.map((reply) => (
        <PostCard key={reply.id} post={reply} />
      ))}
    </div>
  );
}
