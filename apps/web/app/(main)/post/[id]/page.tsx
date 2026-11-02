"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Composer, PostCard, ReplyCard } from "@/components/post";
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

  const pureRepost = Boolean(post?.repostOf && !post.text && post.attachments.length === 0);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Post unavailable"));
  }, [id]);

  useEffect(() => {
    if (pureRepost && post?.repostOf?.id) {
      router.replace(`/post/${post.repostOf.id}`);
    }
  }, [pureRepost, post?.repostOf?.id, router]);

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

      {post && !pureRepost && (
        <PostCard
          post={post}
          onChange={load}
          onRemoved={() => {
            setPost(null);
            router.replace("/home");
          }}
        />
      )}

      {post && !pureRepost && (
        <section className="border-b border-[#f0e6d8] bg-gradient-to-b from-[#fff8ee]/80 to-transparent px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-neutral-500">
            <MessageCircle size={16} className="text-[#c56a00]" />
            <span className="font-medium text-neutral-700">
              {post.replyCount === 0 ? "No replies yet" : `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}`}
            </span>
            <span className="text-neutral-400">· stays on this post, not in the feed</span>
          </div>
          <Composer
            replyTo={id}
            variant="reply"
            placeholder="Write a reply…"
            onPosted={(reply, replaceId) => {
              setReplies((current) => applyPosted(current, reply, replaceId));
              if (!replaceId && reply) setPost((current) => (current ? { ...current, replyCount: current.replyCount + 1 } : current));
              if (replaceId && !reply) setPost((current) => (current ? { ...current, replyCount: Math.max(0, current.replyCount - 1) } : current));
            }}
          />
        </section>
      )}

      {post && !pureRepost && (
        <section className="px-4 pb-10 pt-2">
          {replies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#f0e6d8] bg-white/40 px-4 py-10 text-center">
              <p className="text-sm font-medium text-neutral-700">Start the discussion</p>
              <p className="mt-1 text-sm text-neutral-500">Replies appear here under the post. They do not show up on Home or Explore.</p>
            </div>
          ) : (
            <div className="relative">
              {replies.map((reply) => (
                <ReplyCard
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
          )}
        </section>
      )}
    </div>
  );
}
