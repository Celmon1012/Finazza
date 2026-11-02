"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Heart, ImagePlus, MessageCircle, PenLine, Repeat2, Trash2, X } from "lucide-react";
import { ApiError, api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LinkPreview } from "./link-preview";
import { ReportButton } from "./report-button";
import { RichText } from "./rich-text";
import { Avatar, Button } from "./ui";

export function Composer({
  replyTo,
  placeholder,
  onPosted,
  variant = "post",
}: {
  replyTo?: string;
  placeholder?: string;
  onPosted?: (post: Post | null, replaceId?: string) => void;
  variant?: "post" | "reply";
}) {
  const replyMode = variant === "reply" || Boolean(replyTo);
  const { user } = useAuth();
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ url: string; kind: "image" }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resolvedPlaceholder = placeholder || (replyMode ? t("post.replyPlaceholder") : t("composer.placeholder"));

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
      setError(err instanceof Error ? err.message : t("composer.uploadFailed"));
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
      setError(err instanceof Error ? err.message : t("composer.postFailed"));
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex gap-3 px-4 py-3",
        replyMode
          ? "rounded-2xl border border-[#f0e6d8] bg-white/80 shadow-[0_12px_32px_-28px_rgba(120,70,0,0.55)]"
          : "border-b border-[#f0e6d8]",
      )}
    >
      <Avatar name={user?.displayName || "You"} url={user?.avatarUrl} size={replyMode ? 36 : 40} />
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          maxLength={500}
          onChange={(event) => setText(event.target.value)}
          placeholder={resolvedPlaceholder}
          className={cn(
            "w-full resize-none bg-transparent placeholder:text-neutral-400 focus:outline-none",
            replyMode ? "min-h-12 text-[15px] leading-6" : "min-h-16 text-lg",
          )}
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
        {!replyMode && <LinkPreview text={text} className="mb-3 block overflow-hidden rounded-2xl border border-[#f0e6d8] bg-white/80 transition hover:bg-white" />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[#c56a00]">
            <label className="cursor-pointer">
              <ImagePlus size={18} />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" multiple onChange={(event) => onFiles(event.target.files)} />
            </label>
            {!replyMode && (
              <Link href="/annotate" className="text-xs font-medium">
                {t("composer.annotate")}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs", text.length >= 450 ? "text-[#ff5d73]" : "text-neutral-500")}>
              {text.length === 0
                ? files.length
                  ? t("composer.photoReady")
                  : replyMode
                    ? t("composer.joinThread")
                    : t("composer.writeNote")
                : t("composer.of500", { count: text.length })}
            </span>
            <Button
              type="submit"
              variant={text.trim() || files.length ? "primary" : "outline"}
              disabled={busy || (!text.trim() && files.length === 0)}
              aria-label={text.trim() || files.length ? undefined : t("composer.writeNote")}
            >
              {busy ? t("composer.posting") : replyMode ? t("composer.reply") : t("composer.post")}
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-[#ff5d73]">{error}</p>}
      </div>
    </form>
  );
}

function Embedded({ post, className }: { post: NonNullable<Post["repostOf"]>; className?: string }) {
  const { timeAgo } = useI18n();
  if (!post.author) return null;
  return (
    <Link href={`/post/${post.id}`} className={cn("mt-3 block rounded-2xl border border-[#f0e6d8] bg-white/70 p-3 hover:bg-white", className)}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={20} />
        <span className="font-semibold">{post.author.displayName}</span>
        <span className="text-neutral-500">@{post.author.username}</span>
        <span className="text-neutral-400">· {timeAgo(post.createdAt)}</span>
      </div>
      {post.text && <RichText text={post.text} className="whitespace-pre-wrap break-words text-[15px] leading-6" />}
      <AttachmentGrid files={post.attachments} />
    </Link>
  );
}

function quoteSource(post: Post) {
  const pure = Boolean(post.repostOf && !post.text && post.attachments.length === 0);
  if (pure && post.repostOf) return post.repostOf;
  return {
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    attachments: post.attachments,
    author: post.author,
  };
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
  const { t, timeAgo } = useI18n();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [hidden, setHidden] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const author = post.author;

  useEffect(() => {
    if (!repostMenu) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setRepostMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRepostMenu(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [repostMenu]);

  if (hidden || !author) return null;
  const pending = post.id.startsWith("pending-");
  const pureRepost = Boolean(post.repostOf && !post.text && post.attachments.length === 0);
  const source = quoteSource(post);

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

  async function plainRepost() {
    if (post.id.startsWith("pending-")) return;
    setRepostMenu(false);
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

  async function submitQuote(event: React.FormEvent) {
    event.preventDefault();
    const draft = quoteText.trim();
    if (!draft) {
      setQuoteError("Add a short take to quote this post.");
      return;
    }
    setQuoteBusy(true);
    setQuoteError("");
    try {
      await api<{ post: Post }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ text: draft, attachments: [], repostOf: source.id }),
      });
      setQuoteText("");
      setQuoteOpen(false);
      setReposted(true);
      setRepostCount((count) => count + 1);
      onChange?.();
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Could not post the quote");
    } finally {
      setQuoteBusy(false);
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
    if (removing || !confirm(t("post.deleteConfirm"))) return;
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
      window.alert(err instanceof Error ? err.message : t("post.deleteFailed"));
    }
  }

  return (
    <article className="border-b border-[#f0e6d8] px-4 py-3 transition-colors hover:bg-white/60">
      {pureRepost && (
        <p className="mb-2 pl-12 text-sm text-neutral-500">
          {author.displayName} {t("post.reposted")}
        </p>
      )}
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
              {t("post.replyingTo")}{" "}
              <Link className="text-[#c56a00]" href={`/u/${post.replyToAuthor.username}`}>
                @{post.replyToAuthor.username}
              </Link>
            </p>
          )}
          {post.text && <RichText text={post.text} className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6" />}
          {post.text && <LinkPreview text={post.text} />}
          <AttachmentGrid files={post.attachments} />
          {post.repostOf && <Embedded post={post.repostOf} />}
          <div className="mt-3 flex max-w-md items-center justify-between text-neutral-500">
            {pureRepost ? (
              <Link
                href={`/post/${post.repostOf!.id}`}
                className="inline-flex items-center gap-1.5 text-sm hover:text-[#c56a00]"
                title={t("post.commentOnOriginal")}
              >
                <MessageCircle size={16} />
              </Link>
            ) : pending ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <MessageCircle size={16} /> {post.replyCount || ""}
              </span>
            ) : (
              <Link href={`/post/${post.id}`} className="inline-flex items-center gap-1.5 text-sm hover:text-[#c56a00]">
                <MessageCircle size={16} /> {post.replyCount || ""}
              </Link>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRepostMenu((open) => !open)}
                aria-label={t("post.repostOrQuote")}
                aria-expanded={repostMenu}
                className={cn("inline-flex items-center gap-1.5 text-sm hover:text-[#3dd68c]", reposted && "text-[#3dd68c]")}
              >
                <Repeat2 size={16} /> {repostCount || ""}
              </button>
              {repostMenu && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#f0e6d8] bg-white py-1 shadow-[0_18px_40px_-24px_rgba(28,20,12,0.45)]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#fff8ee]"
                    onClick={plainRepost}
                  >
                    <Repeat2 size={16} className="text-[#3dd68c]" />
                    <span>
                      <span className="block font-semibold">{reposted ? t("post.undoRepost") : t("post.repost")}</span>
                      <span className="block text-xs text-neutral-500">{reposted ? t("post.undoRepostHint") : t("post.repostHint")}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#fff8ee]"
                    onClick={() => {
                      setRepostMenu(false);
                      setQuoteOpen(true);
                      setQuoteError("");
                    }}
                  >
                    <PenLine size={16} className="text-[#c56a00]" />
                    <span>
                      <span className="block font-semibold">{t("post.quote")}</span>
                      <span className="block text-xs text-neutral-500">{t("post.quoteHint")}</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
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

      {quoteOpen && source.author && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Quote post">
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={() => !quoteBusy && setQuoteOpen(false)} />
          <form
            onSubmit={submitQuote}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[28px] border border-[#f0e6d8] bg-[#fffaf3] shadow-[0_-24px_60px_-28px_rgba(28,20,12,0.45)] sm:rounded-[28px]"
          >
            <div className="flex items-center justify-between border-b border-[#f0e6d8] px-4 py-3">
              <button type="button" className="rounded-full p-1.5 text-neutral-500 hover:bg-white" aria-label="Close" disabled={quoteBusy} onClick={() => setQuoteOpen(false)}>
                <X size={18} />
              </button>
              <h2 className="text-base font-semibold">{t("post.quoteTitle")}</h2>
              <Button type="submit" disabled={quoteBusy || !quoteText.trim()} className="min-w-[5.5rem]">
                {quoteBusy ? t("post.quoteBusy") : t("post.quoteSubmit")}
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex gap-3">
                <Avatar name={user?.displayName || "You"} url={user?.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <textarea
                    value={quoteText}
                    maxLength={500}
                    autoFocus
                    onChange={(event) => setQuoteText(event.target.value)}
                    placeholder={t("post.quotePlaceholder")}
                    className="min-h-24 w-full resize-none bg-transparent text-lg placeholder:text-neutral-400 focus:outline-none"
                  />
                  <Embedded post={source as NonNullable<Post["repostOf"]>} className="mt-2" />
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
                    <span>{t("post.quoteHelp")}</span>
                    <span className={cn(quoteText.length >= 450 && "text-[#ff5d73]")}>{quoteText.length}/500</span>
                  </div>
                  {quoteError && <p className="mt-2 text-sm text-[#ff5d73]">{quoteError}</p>}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

/** Compact comment row for the post detail thread (not shown in the main feed). */
export function ReplyCard({
  post,
  onRemoved,
  onRestored,
}: {
  post: Post;
  onRemoved?: (id: string) => void;
  onRestored?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const { t, timeAgo } = useI18n();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [hidden, setHidden] = useState(false);
  const [removing, setRemoving] = useState(false);
  const author = post.author;
  const pending = post.id.startsWith("pending-");

  if (hidden || !author) return null;

  async function toggleLike() {
    if (pending) return;
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

  async function remove() {
    if (removing || !confirm(t("post.deleteReplyConfirm"))) return;
    setRemoving(true);
    setHidden(true);
    onRemoved?.(post.id);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return;
      setHidden(false);
      setRemoving(false);
      onRestored?.(post);
      window.alert(err instanceof Error ? err.message : t("post.deleteReplyFailed"));
    }
  }

  return (
    <article className="group relative flex gap-3 px-1 py-4">
      <div className="absolute left-[17px] top-0 h-full w-px bg-[#f0e6d8] group-last:hidden" aria-hidden />
      <Link href={`/u/${author.username}`} className="relative z-[1] shrink-0">
        <Avatar name={author.displayName} url={author.avatarUrl} size={34} />
      </Link>
      <div className="min-w-0 flex-1 rounded-2xl border border-[#f0e6d8]/80 bg-white/70 px-3.5 py-3 shadow-[0_10px_28px_-26px_rgba(120,70,0,0.5)]">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <Link href={`/u/${author.username}`} className="font-semibold hover:underline">
            {author.displayName}
          </Link>
          <span className="text-neutral-500">@{author.username}</span>
          <span className="text-neutral-400">· {timeAgo(post.createdAt)}</span>
        </div>
        {post.text && <RichText text={post.text} className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-6" />}
        <AttachmentGrid files={post.attachments} />
        <div className="mt-2.5 flex items-center gap-4 text-neutral-500">
          <button
            type="button"
            disabled={pending}
            onClick={toggleLike}
            className={cn("inline-flex items-center gap-1.5 text-xs hover:text-[#ff5d73]", liked && "text-[#ff5d73]")}
          >
            <Heart size={14} fill={liked ? "currentColor" : "none"} /> {likeCount || ""}
          </button>
          {user?.id === author.id && !pending && (
            <button type="button" onClick={remove} aria-label="Delete reply" className="text-xs hover:text-[#ff5d73]">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
