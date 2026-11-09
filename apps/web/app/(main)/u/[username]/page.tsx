"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PortfolioBoard } from "@/components/investments";
import { PostCard } from "@/components/post";
import { ReportButton } from "@/components/report-button";
import { Avatar, AvatarPicker, Button, Field, Modal, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import { applyRemoved, applyRestored, onlyFeedPosts } from "@/lib/posts-sync";
import type { Conversation, Investment, Post, Profile, PublicUser } from "@/lib/types";

export default function ProfilePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfileScreen />
    </Suspense>
  );
}

function ProfileScreen() {
  const params = useParams<{ username: string }>();
  const search = useSearchParams();
  const username = params?.username ?? "";
  const requested = search?.get("tab");
  const tab = requested === "investment" || requested === "portfolio" ? "investment" : requested === "profile" ? "profile" : "posts";
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [draft, setDraft] = useState({ displayName: "", bio: "", location: "", website: "" });
  const [listKind, setListKind] = useState<"followers" | "following" | null>(null);
  const [listPeople, setListPeople] = useState<PublicUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  async function load() {
    const data = await api<{ profile: Profile }>(`/api/users/${username}`);
    setProfile(data.profile);
    const [postData, investmentData] = await Promise.all([
      api<{ posts: Post[] }>(`/api/users/${username}/posts`),
      api<{ investments: Investment[] }>(`/api/investments/user/${username}`),
    ]);
    setPosts(onlyFeedPosts(postData.posts));
    setInvestments(investmentData.investments);
  }

  useEffect(() => {
    setError("");
    setProfile(null);
    load().catch((err) => setError(err instanceof Error ? err.message : t("profile.unavailable")));
  }, [username]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#portfolio" || hash === "#investment") {
      router.replace(`/u/${username}?tab=investment`);
    } else if (hash === "#profile") {
      router.replace(`/u/${username}?tab=profile`);
    }
  }, [username, router]);

  function chooseTab(next: "posts" | "profile" | "investment") {
    router.replace(next === "posts" ? `/u/${username}` : `/u/${username}?tab=${next}`);
  }

  async function follow() {
    const previous = profile;
    if (!previous) return;
    const following = !previous.isFollowing;
    setProfile({ ...previous, isFollowing: following, followersCount: Math.max(0, previous.followersCount + (following ? 1 : -1)) });
    try {
      const result = await api<{ following: boolean }>(`/api/users/${username}/follow`, { method: "POST" });
      setProfile((current) =>
        current ? { ...current, isFollowing: result.following, followersCount: Math.max(0, previous.followersCount + (result.following ? 1 : -1)) } : current,
      );
    } catch {
      setProfile(previous);
    }
  }

  async function setFlag(kind: "block" | "mute", value: boolean) {
    await api(`/api/users/${username}/${kind}`, { method: "POST", body: JSON.stringify(kind === "block" ? { blocked: value } : { muted: value }) });
    await load();
  }

  function openEditor() {
    if (!profile) return;
    setDraft({
      displayName: profile.displayName,
      bio: profile.bio || "",
      location: profile.location || "",
      website: profile.website || "",
    });
    setEditError("");
    setEditing(true);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setEditError("");
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify(draft) });
      setProfile({ ...profile, ...draft });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function openFollowList(kind: "followers" | "following") {
    setListKind(kind);
    setListPeople([]);
    setListError("");
    setListLoading(true);
    try {
      const data = await api<{ users: PublicUser[] }>(`/api/users/${username}/${kind}`);
      setListPeople(data.users);
    } catch (err) {
      setListError(err instanceof Error ? err.message : t("profile.listUnavailable"));
    } finally {
      setListLoading(false);
    }
  }

  async function message() {
    const result = await api<{ conversation: Conversation }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "dm", username }),
    });
    router.push(`/chat/${result.conversation.id}`);
  }

  if (error) return <p className="px-4 py-8 text-sm text-[#ff5d73]">{error}</p>;
  if (!profile) return <Spinner />;
  const mine = user?.username === profile.username;

  return (
    <div>
      <header className="border-b border-neutral-200 px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {mine ? (
            <AvatarPicker
              name={profile.displayName}
              url={profile.avatarUrl}
              size={72}
              onChange={(avatarUrl) => {
                setProfile((current) => (current ? { ...current, avatarUrl } : current));
                refreshUser().catch(() => undefined);
              }}
            />
          ) : (
            <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {mine ? (
              <Button variant="outline" onClick={openEditor}>
                {t("profile.edit")}
              </Button>
            ) : (
              <>
                <Button variant={profile.isFollowing ? "outline" : "primary"} onClick={follow}>
                  {profile.isFollowing ? t("profile.following") : t("profile.follow")}
                </Button>
                <Button variant="ghost" onClick={message}>
                  {t("profile.message")}
                </Button>
              </>
            )}
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{profile.displayName}</h1>
        <p className="text-neutral-500">@{profile.username}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <button type="button" className="hover:underline" onClick={() => openFollowList("following")}>
            <span className="font-semibold">{profile.followingCount}</span> <span className="text-neutral-500">{t("profile.followingLabel")}</span>
          </button>
          <button type="button" className="hover:underline" onClick={() => openFollowList("followers")}>
            <span className="font-semibold">{profile.followersCount}</span> <span className="text-neutral-500">{t("profile.followersLabel")}</span>
          </button>
        </p>
        {!mine && (
          <div className="mt-3 flex gap-3 text-xs">
            <button type="button" className="text-neutral-500" onClick={() => setFlag("mute", !profile.youMuted)}>
              {profile.youMuted ? t("profile.unmute") : t("profile.mute")}
            </button>
            <button type="button" className="text-neutral-500" onClick={() => setFlag("block", !profile.youBlocked)}>
              {profile.youBlocked ? t("profile.unblock") : t("profile.block")}
            </button>
            <ReportButton targetType="user" targetId={profile.id} />
          </div>
        )}
      </header>

      <div className="flex border-b border-neutral-200" role="tablist">
        {(
          [
            ["posts", "profile.tabPosts"],
            ["profile", "profile.tabProfile"],
            ["investment", "profile.tabInvestment"],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`flex-1 py-3 text-sm ${tab === value ? "border-b-2 border-[#ffc14d] font-semibold" : "text-neutral-500"}`}
            onClick={() => chooseTab(value)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <section>
          {profile.youBlocked ? (
            <p className="px-4 py-8 text-sm text-neutral-500">{t("profile.blockedPosts")}</p>
          ) : posts.length === 0 ? (
            <p className="px-4 py-8 text-sm text-neutral-500">{t("profile.noPosts")}</p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onRemoved={(id) => setPosts((current) => applyRemoved(current, id))}
                onRestored={(item) => setPosts((current) => applyRestored(current, item))}
              />
            ))
          )}
        </section>
      )}

      {tab === "profile" && (
        <>
          <section className="border-b border-neutral-200 px-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">{t("profile.personalDesc")}</h2>
              {mine && (
                <button type="button" className="text-sm text-[#c56a00]" onClick={openEditor}>
                  {t("profile.edit")}
                </button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap">{profile.bio || (mine ? t("profile.noBioMine") : t("profile.noBio"))}</p>
          </section>
          <section className="border-b border-neutral-200 px-4 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">{t("profile.contact")}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {mine && (
                <div>
                  <dt className="text-neutral-500">{t("auth.email")}</dt>
                  <dd className="mt-0.5">{user?.email}</dd>
                  <dd className="text-xs text-neutral-500">{t("profile.emailOnlyYou")}</dd>
                </div>
              )}
              <div>
                <dt className="text-neutral-500">{t("profile.location")}</dt>
                <dd className="mt-0.5">{profile.location || t("profile.notShared")}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">{t("profile.website")}</dt>
                <dd className="mt-0.5">
                  {profile.website ? (
                    <a href={profile.website} className="text-[#c56a00]" target="_blank" rel="noreferrer">
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    t("profile.notShared")
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </>
      )}

      {editing && (
        <Modal title={t("profile.edit")} onClose={() => setEditing(false)}>
          <form className="space-y-3" onSubmit={saveProfile}>
            <Field label={t("settings.displayName")}>
              <input className={inputClass} value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
            </Field>
            <Field label={t("settings.bio")}>
              <textarea className={inputClass} maxLength={160} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
            </Field>
            <Field label={t("settings.location")}>
              <input className={inputClass} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
            </Field>
            <Field label={t("settings.website")}>
              <input className={inputClass} placeholder="https://" value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} />
            </Field>
            {editError && <p className="text-sm text-[#ff5d73]">{editError}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? t("settings.saving") : t("settings.saveProfile")}
            </Button>
          </form>
        </Modal>
      )}

      {listKind && (
        <Modal title={listKind === "followers" ? t("profile.followersLabel") : t("profile.followingLabel")} onClose={() => setListKind(null)}>
          {listLoading ? (
            <Spinner />
          ) : listError ? (
            <p className="text-sm text-[#ff5d73]">{listError}</p>
          ) : listPeople.length === 0 ? (
            <p className="text-sm text-neutral-500">{listKind === "followers" ? t("profile.noFollowers") : t("profile.noFollowing")}</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {listPeople.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/u/${person.username}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-100"
                    onClick={() => setListKind(null)}
                  >
                    <Avatar name={person.displayName} url={person.avatarUrl} size={36} />
                    <span>
                      <span className="block text-sm font-semibold">{person.displayName}</span>
                      <span className="block text-xs text-neutral-500">@{person.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {tab === "investment" && (
        <section>
          <h2 className="px-4 pt-5 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">{t("profile.portfolioHeading")}</h2>
          {profile.youBlocked ? (
            <p className="px-4 py-8 text-sm text-neutral-500">{t("profile.blockedRecords")}</p>
          ) : (
            <PortfolioBoard items={investments} mine={mine} onChange={setInvestments} />
          )}
        </section>
      )}
    </div>
  );
}
