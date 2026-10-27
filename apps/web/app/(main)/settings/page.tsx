"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Button, Field, AvatarPicker, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me, PublicUser } from "@/lib/types";

const settingLabels = [
  ["likes", "Likes"],
  ["replies", "Replies"],
  ["reposts", "Reposts"],
  ["follows", "Follows"],
  ["mentions", "Mentions"],
  ["chat", "Chat"],
  ["moderation", "Moderation"],
] as const;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ displayName: "", bio: "", location: "", website: "", messagePrivacy: "everyone" as Me["messagePrivacy"] });
  const [settings, setSettings] = useState(user?.notificationSettings);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [relations, setRelations] = useState<{ blocked: PublicUser[]; muted: PublicUser[] }>({ blocked: [], muted: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setProfile({
      displayName: user.displayName,
      bio: user.bio || "",
      location: user.location,
      website: user.website,
      messagePrivacy: user.messagePrivacy,
    });
    setSettings(user.notificationSettings);
  }, [user]);

  useEffect(() => {
    api<{ blocked: PublicUser[]; muted: PublicUser[] }>("/api/users/me/relations").then(setRelations).catch(() => undefined);
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify(profile) });
      await refreshUser();
      setMessage("Profile saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function saveSettings(next: NonNullable<typeof settings>) {
    setSettings(next);
    await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ notificationSettings: next }) });
    await refreshUser();
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/users/me/password", { method: "POST", body: JSON.stringify(passwords) });
      setPasswords({ currentPassword: "", newPassword: "" });
      setMessage("Password updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password");
    }
  }

  if (!user || !settings) return null;

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="border-b border-neutral-200 px-4 py-4">
        <h2 className="mb-3 font-semibold">Profile photo</h2>
        <AvatarPicker
          name={user.displayName}
          url={user.avatarUrl}
          onChange={(avatarUrl) => {
            refreshUser().catch(() => undefined);
            setMessage(avatarUrl ? "Photo saved" : "Photo removed");
          }}
        />
      </div>
      <form className="space-y-3 px-4 py-4" onSubmit={saveProfile}>
        <Field label="Display name">
          <input className={inputClass} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
        </Field>
        <Field label="Bio">
          <textarea className={inputClass} maxLength={160} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        </Field>
        <Field label="Location">
          <input className={inputClass} value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
        </Field>
        <Field label="Website">
          <input className={inputClass} placeholder="https://" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} />
        </Field>
        <Field label="Who can message or invite you">
          <select className={inputClass} value={profile.messagePrivacy} onChange={(event) => setProfile({ ...profile, messagePrivacy: event.target.value as Me["messagePrivacy"] })}>
            <option value="everyone">Everyone</option>
            <option value="followers">Only people I follow</option>
          </select>
        </Field>
        <Button type="submit">Save profile</Button>
      </form>

      <section className="border-t border-neutral-200 px-4 py-4">
        <h2 className="font-semibold">Notification types</h2>
        <div className="mt-3 space-y-2">
          {settingLabels.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              {label}
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(event) => saveSettings({ ...settings, [key]: event.target.checked })}
              />
            </label>
          ))}
        </div>
      </section>

      <form className="space-y-3 border-t border-neutral-200 px-4 py-4" onSubmit={savePassword}>
        <h2 className="font-semibold">Password</h2>
        <input className={inputClass} type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
        <input className={inputClass} type="password" placeholder="New password" minLength={8} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
        <Button type="submit" variant="outline">
          Update password
        </Button>
      </form>

      <section className="border-t border-neutral-200 px-4 py-4 text-sm">
        <h2 className="font-semibold">Blocked</h2>
        {relations.blocked.length === 0 && <p className="mt-2 text-neutral-500">Nobody is blocked.</p>}
        {relations.blocked.map((person) => (
          <p key={person.id} className="mt-2">@{person.username}</p>
        ))}
        <h2 className="mt-4 font-semibold">Muted</h2>
        {relations.muted.length === 0 && <p className="mt-2 text-neutral-500">Nobody is muted.</p>}
        {relations.muted.map((person) => (
          <p key={person.id} className="mt-2">@{person.username}</p>
        ))}
      </section>
      {message && <p className="px-4 pb-6 text-sm text-[#3dd68c]">{message}</p>}
      {error && <p className="px-4 pb-6 text-sm text-[#ff5d73]">{error}</p>}
    </div>
  );
}
