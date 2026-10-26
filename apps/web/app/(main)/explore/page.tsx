"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/post";
import { PageHeader } from "@/components/shell";
import { Avatar, inputClass, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import type { Post, PublicUser } from "@/lib/types";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ posts: Post[] }>("/api/posts/feed?tab=explore")
      .then((data) => setPosts(data.posts))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ users: PublicUser[]; posts: Post[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`).then((data) => {
        setUsers(data.users);
        setPosts(data.posts);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <PageHeader title="Explore" subtitle="Latest notes across FINAZZA" />
      <div className="border-b border-neutral-200 p-4">
        <input className={inputClass} placeholder="Search people and posts" value={query} onChange={(event) => setQuery(event.target.value)} />
        {users.length > 0 && (
          <ul className="mt-3 space-y-2">
            {users.map((person) => (
              <li key={person.id}>
                <Link href={`/u/${person.username}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-100">
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
      </div>
      {loading && <Spinner />}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
