"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Heart, ImagePlus, MessageCircle, Repeat2, Trash2 } from "lucide-react";
import { ApiError, api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { LinkPreview } from "./link-preview";
import { ReportButton } from "./report-button";
import { RichText } from "./rich-text";
import { Avatar, Button } from "./ui";

export function Composer({
  replyTo,
  placeholder = "Share a position, a chart, or a note",
  onPosted,
}: {
  replyTo?: string;
  placeholder?: string;
  onPosted?: (post: Post | null, replaceId?: string) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ url: string; kind: "image" }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const form = new FormData();
    [...list].slice(0, 4 - files.length).forEach((file) => form.append("files", file));
    setBusy(true);
    setError("");
    try {
      const result = await api<{ files: { url: string; kind: "image" }[] }>("/api/uploads", { method: "POST", body: form });
      setFiles((current) => [...current, ...result.files].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const draft = text;
    const photos = files;
    if (!draft.trim() && photos.length === 0) return;
    const pendingId = `pending-${Date.now()}`;
    setText("");
    setFiles([]);
    setError("");
    onPosted?.(
      {
        id: pendingId,
        text: draft.trim(),
        createdAt: new Date().toISOString(),
        attachments: photos,
        replyTo: replyTo || null,
        replyToAuthor: null,
        repostOf: null,
        author: user
          ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
          : null,
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        liked: false,
        reposted: false,
        bookmarked: false,
      },
    );
    try {
      const result = await api<{ post: Post }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text: draft, attachments: photos, replyTo: replyTo || null }),
      });
      onPosted?.(result.post, pendingId);
    } catch (err) {
      onPosted?.(null, pendingId);
      setText((current) => current || draft);
      setFiles((current) => (current.length ? current : photos));
      setError(err instanceof Error ? err.message : "Could not post");
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-3 border-b border-[#f0e6d8] px-4 py-3">
      <Avatar name={user?.displayName || "You"} url={user?.avatarUrl} />
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          maxLength={500}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          className="min-h-16 w-full resize-none bg-transparent text-lg placeholder:text-neutral-400"
        />
        {files.length > 0 && (
          <div className="mb-2 flex gap-2">
            {files.map((file) => (
              <button key={file.url} type="button" className="relative" onClick={() => setFiles((current) => current.filter((item) => item.url !== file.url))}>
                <img src={mediaUrl(file.url)} alt="" className="h-20 w-20 rounded-xl object-cover" />
              </button>
            ))}
          </div>
        )}
        <LinkPreview text={text} className="mb-3 block overflow-hidden rounded-2xl border border-[#f0e6d8] bg-white/80 transition hover:bg-white" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[#c56a00]">
            <label className="cursor-pointer">
              <ImagePlus size={18} />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" multiple onChange={(event) => onFiles(event.target.files)} />
            </label>
            <Link href="/annotate" className="text-xs font-medium">
              Annotate chart
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs", text.length >= 450 ? "text-[#ff5d73]" : "text-neutral-500")}>
              {text.length === 0 ? (files.length ? "Photo ready" : "Write a note to post") : `${text.length} of 500`}
            </span>
            <Button
              type="submit"
              variant={text.trim() || files.length ? "primary" : "outline"}
              disabled={busy || (!text.trim() && files.length === 0)}
              aria-label={text.trim() || files.length ? undefined : "Write a note or add a photo first"}
            >
              {busy ? "Posting…" : replyTo ? "Reply" : "Post"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-[#ff5d73]">{error}</p>}
      </div>
    </form>
  );
}

function Embedded({ post }: { post: NonNullable<Post["repostOf"]> }) {
  if (!post.author) return null;
  return (
    <Link href={`/post/${post.id}`} className="mt-3 block rounded-2xl border border-neutral-200 p-3 hover:bg-neutral-50">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={20} />
        <span className="font-semibold">{post.author.displayName}</span>
        <span className="text-neutral-500">@{post.author.username}</span>
      </div>
      <RichText text={post.text} />
      <AttachmentGrid files={post.attachments} />
    </Link>
  );
}

function AttachmentGrid({ files }: { files: { url: string }[] }) {
  if (!files.length) return null;
  return (
    <div className={cn("mt-3 grid gap-2", files.length > 1 && "grid-cols-2")}>
      {files.map((file) => (
        <a key={file.url} href={mediaUrl(file.url)} target="_blank" rel="noreferrer">
          <img src={mediaUrl(file.url)} alt="" className="max-h-80 w-full rounded-2xl border border-neutral-200 object-cover" />
        </a>
      ))}
    </div>
  );
}

export function PostCard({
  post,
  onChange,
  onBookmark,
  onRemoved,
  onRestored,
}: {
  post: Post;
  onChange?: () => void;
  onBookmark?: (bookmarked: boolean) => void;
  onRemoved?: (id: string) => void;
  onRestored?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [hidden, setHidden] = useState(false);
  const [removing, setRemoving] = useState(false);
  const author = post.author;

  if (hidden || !author) return null;
  const pending = post.id.startsWith("pending-");
  const pureRepost = Boolean(post.repostOf && !post.text && post.attachments.length === 0);

  async function toggleLike() {
    if (post.id.startsWith("pending-")) return;
    const previous = { liked, likeCount };
    setLiked(!liked);
    setLikeCount(Math.max(0, likeCount + (liked ? -1 : 1)));
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setLiked(previous.liked);
      setLikeCount(previous.likeCount);
    }
  }

  async function toggleRepost() {
    if (post.id.startsWith("pending-")) return;
    const previous = { reposted, repostCount };
    setReposted(!reposted);
    setRepostCount(Math.max(0, repostCount + (reposted ? -1 : 1)));
    try {
      const target = pureRepost && post.repostOf ? post.repostOf.id : post.id;
      const result = await api<{ reposted: boolean; repostCount: number }>(`/api/posts/${target}/repost`, { method: "POST" });
      setReposted(result.reposted);
      setRepostCount(result.repostCount);
      onChange?.();
    } catch {
      setReposted(previous.reposted);
      setRepostCount(previous.repostCount);
    }
  }

  async function toggleBookmark() {
    if (pending) return;
    const previous = bookmarked;
    setBookmarked(!bookmarked);
    try {
      const result = await api<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      setBookmarked(result.bookmarked);
      onBookmark?.(result.bookmarked);
    } catch {
      setBookmarked(previous);
    }
  }

  async function remove() {
    if (removing || !confirm("Remove this post?")) return;
    setRemoving(true);
    // Optimistic — match Composer: UI updates immediately, then the server confirms.
    setHidden(true);
    onRemoved?.(post.id);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return;
      setHidden(false);
      setRemoving(false);
      onRestored?.(post);
      window.alert(err instanceof Error ? err.message : "Could not remove this post");
    }
  }

  return (
    <article className="border-b border-[#f0e6d8] px-4 py-3 transition-colors hover:bg-white/60">
      {pureRepost && <p className="mb-2 pl-12 text-sm text-neutral-500">{author.displayName} reposted</p>}
      <div className="flex gap-3">
        <Link href={`/u/${author.username}`}>
          <Avatar name={author.displayName} url={author.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/u/${author.username}`} className="truncate font-semibold hover:underline">
              {author.displayName}
            </Link>
            <span className="truncate text-neutral-500">@{author.username}</span>
            <span className="text-neutral-500">· {timeAgo(post.createdAt)}</span>
          </div>
          {post.replyToAuthor && (
            <p className="text-sm text-neutral-500">
              Replying to <Link className="text-[#c56a00]" href={`/u/${post.replyToAuthor.username}`}>@{post.replyToAuthor.username}</Link>
            </p>
          )}
          {post.text && <RichText text={post.text} className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6" />}
          {post.text && <LinkPreview text={post.text} />}
          <AttachmentGrid files={post.attachments} />
          {post.repostOf && <Embedded post={post.repostOf} />}
          <div className="mt-3 flex max-w-md items-center justify-between text-neutral-500">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <MessageCircle size={16} /> {post.replyCount || ""}
              </span>
            ) : (
              <Link href={`/post/${pureRepost && post.repostOf ? post.repostOf.id : post.id}`} className="inline-flex items-center gap-1.5 text-sm hover:text-[#c56a00]">
                <MessageCircle size={16} /> {post.replyCount || ""}
              </Link>
            )}
            <button type="button" onClick={toggleRepost} className={cn("inline-flex items-center gap-1.5 text-sm hover:text-[#3dd68c]", reposted && "text-[#3dd68c]")}>
              <Repeat2 size={16} /> {repostCount || ""}
            </button>
            <button type="button" onClick={toggleLike} className={cn("inline-flex items-center gap-1.5 text-sm hover:text-[#ff5d73]", liked && "text-[#ff5d73]")}>
              <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likeCount || ""}
            </button>
            <button
              type="button"
              onClick={toggleBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              className={cn("inline-flex items-center text-sm hover:text-[#c56a00]", bookmarked && "text-[#c56a00]")}
            >
              <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <span className="flex items-center gap-3">
              <ReportButton targetType="post" targetId={pureRepost && post.repostOf ? post.repostOf.id : post.id} label="" />
              {user?.id === author.id && !pending && (
                <button type="button" onClick={remove} aria-label="Delete post" className="hover:text-[#ff5d73]">
                  <Trash2 size={15} />
                </button>
              )}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
