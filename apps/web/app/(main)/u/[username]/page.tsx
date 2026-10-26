"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { InvestmentCard } from "@/components/investments";
import { PostCard } from "@/components/post";
import { ReportButton } from "@/components/report-button";
import { Avatar, Button, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Conversation, Investment, Post, Profile } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"posts" | "investments">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ profile: Profile }>(`/api/users/${username}`);
    setProfile(data.profile);
    const [postData, investmentData] = await Promise.all([
      api<{ posts: Post[] }>(`/api/users/${username}/posts`),
      api<{ investments: Investment[] }>(`/api/investments/user/${username}`),
    ]);
    setPosts(postData.posts);
    setInvestments(investmentData.investments);
  }

  useEffect(() => {
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Profile unavailable"));
  }, [username]);

  async function follow() {
    const result = await api<{ following: boolean }>(`/api/users/${username}/follow`, { method: "POST" });
    setProfile((current) => (current ? { ...current, isFollowing: result.following, followersCount: current.followersCount + (result.following ? 1 : -1) } : current));
  }

  async function setFlag(kind: "block" | "mute", value: boolean) {
    await api(`/api/users/${username}/${kind}`, { method: "POST", body: JSON.stringify(kind === "block" ? { blocked: value } : { muted: value }) });
    await load();
  }

  async function message() {
    const result = await api<{ conversation: Conversation }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "dm", username: username }),
    });
    router.push(`/chat/${result.conversation.id}`);
  }

  if (error) return <p className="px-4 py-8 text-sm text-[#ff5d73]">{error}</p>;
  if (!profile) return <Spinner />;
  const mine = user?.username === profile.username;

  return (
    <div>
      <header className="border-b border-neutral-200 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
          <div className="flex flex-wrap justify-end gap-2">
            {mine ? (
              <Link href="/settings" className="rounded-full border border-neutral-300 px-4 py-2 text-sm">
                Edit profile
              </Link>
            ) : (
              <>
                <Button variant={profile.isFollowing ? "outline" : "primary"} onClick={follow}>
                  {profile.isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="ghost" onClick={message}>
                  Message
                </Button>
              </>
            )}
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{profile.displayName}</h1>
        <p className="text-neutral-500">@{profile.username}</p>
        {profile.bio && <p className="mt-3">{profile.bio}</p>}
        <p className="mt-2 text-sm text-neutral-500">
          {profile.location}
          {profile.website && (
            <>
              {" · "}
              <a href={profile.website} className="text-[#c56a00]" target="_blank" rel="noreferrer">
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            </>
          )}
        </p>
        <p className="mt-3 text-sm">
          <span className="font-semibold">{profile.followingCount}</span> <span className="text-neutral-500">Following</span>
          <span className="ml-4 font-semibold">{profile.followersCount}</span> <span className="text-neutral-500">Followers</span>
        </p>
        {!mine && (
          <div className="mt-3 flex gap-3 text-xs">
            <button type="button" className="text-neutral-500" onClick={() => setFlag("mute", !profile.youMuted)}>
              {profile.youMuted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className="text-neutral-500" onClick={() => setFlag("block", !profile.youBlocked)}>
              {profile.youBlocked ? "Unblock" : "Block"}
            </button>
            <ReportButton targetType="user" targetId={profile.id} />
          </div>
        )}
      </header>
      <div className="flex border-b border-neutral-200">
        {(["posts", "investments"] as const).map((item) => (
          <button key={item} type="button" className={`flex-1 py-3 text-sm capitalize ${tab === item ? "border-b-2 border-[#ffc14d] font-semibold" : "text-neutral-500"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>
      {profile.youBlocked ? (
        <p className="px-4 py-8 text-sm text-neutral-500">You blocked this account. Unblock to see posts and records.</p>
      ) : tab === "posts" ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        investments.map((item) => <InvestmentCard key={item.id} item={item} mine={mine} />)
      )}
    </div>
  );
}
