"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Button, Field, AvatarPicker, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n";
import type { Me, PublicUser } from "@/lib/types";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState({ displayName: "", bio: "", location: "", website: "", messagePrivacy: "everyone" as Me["messagePrivacy"] });
  const [settings, setSettings] = useState(user?.notificationSettings);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [relations, setRelations] = useState<{ blocked: PublicUser[]; muted: PublicUser[] }>({ blocked: [], muted: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const settingLabels = [
    ["likes", "settings.notif.likes"],
    ["replies", "settings.notif.replies"],
    ["reposts", "settings.notif.reposts"],
    ["follows", "settings.notif.follows"],
    ["mentions", "settings.notif.mentions"],
    ["chat", "settings.notif.chat"],
    ["moderation", "settings.notif.moderation"],
  ] as const;

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
    if (!user) return;
    setError("");
    setSavingProfile(true);
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify(profile) });
      await refreshUser();
      router.replace(`/u/${user.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveFailed"));
      setSavingProfile(false);
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
      setMessage(t("settings.passwordUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.passwordFailed"));
    }
  }

  if (!user || !settings) return null;

  return (
    <div>
      <PageHeader title={t("settings.title")} />

      <section className="border-b border-neutral-200 px-4 py-4">
        <h2 className="font-semibold">{t("settings.language")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("settings.languageHint")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["en", "settings.english"],
              ["zh-HK", "settings.zhHK"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                const next = value as Locale;
                setLocale(next);
                api("/api/users/me", { method: "PATCH", body: JSON.stringify({ locale: next }) })
                  .then(() => refreshUser())
                  .then(() => setMessage(t("settings.languageSaved")))
                  .catch((err) => setError(err instanceof Error ? err.message : t("settings.saveFailed")));
              }}
              className={
                locale === value
                  ? "rounded-2xl border border-[#c56a00] bg-[#fff8ee] px-4 py-3 text-left text-sm font-semibold text-[#c56a00]"
                  : "rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm hover:bg-neutral-50"
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      <div className="border-b border-neutral-200 px-4 py-4">
        <h2 className="mb-3 font-semibold">{t("settings.profilePhoto")}</h2>
        <AvatarPicker
          name={user.displayName}
          url={user.avatarUrl}
          onChange={(avatarUrl) => {
            refreshUser().catch(() => undefined);
            setMessage(avatarUrl ? t("settings.photoSaved") : t("settings.photoRemoved"));
          }}
        />
      </div>
      <form className="space-y-3 px-4 py-4" onSubmit={saveProfile}>
        <Field label={t("settings.displayName")}>
          <input className={inputClass} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
        </Field>
        <Field label={t("settings.bio")}>
          <textarea className={inputClass} maxLength={160} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        </Field>
        <Field label={t("settings.location")}>
          <input className={inputClass} value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
        </Field>
        <Field label={t("settings.website")}>
          <input className={inputClass} placeholder="https://" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} />
        </Field>
        <Field label={t("settings.messagePrivacy")}>
          <select className={inputClass} value={profile.messagePrivacy} onChange={(event) => setProfile({ ...profile, messagePrivacy: event.target.value as Me["messagePrivacy"] })}>
            <option value="everyone">{t("settings.everyone")}</option>
            <option value="followers">{t("settings.followersOnly")}</option>
          </select>
        </Field>
        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? t("settings.saving") : t("settings.saveProfile")}
        </Button>
      </form>

      <section className="border-t border-neutral-200 px-4 py-4">
        <h2 className="font-semibold">{t("settings.notificationTypes")}</h2>
        <div className="mt-3 space-y-2">
          {settingLabels.map(([key, labelKey]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              {t(labelKey)}
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
        <h2 className="font-semibold">{t("settings.password")}</h2>
        <input className={inputClass} type="password" placeholder={t("settings.currentPassword")} value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
        <input className={inputClass} type="password" placeholder={t("settings.newPassword")} minLength={8} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
        <Button type="submit" variant="outline">
          {t("settings.updatePassword")}
        </Button>
      </form>

      <section className="border-t border-neutral-200 px-4 py-4 text-sm">
        <h2 className="font-semibold">{t("settings.blocked")}</h2>
        {relations.blocked.length === 0 && <p className="mt-2 text-neutral-500">{t("settings.nobodyBlocked")}</p>}
        {relations.blocked.map((person) => (
          <p key={person.id} className="mt-2">@{person.username}</p>
        ))}
        <h2 className="mt-4 font-semibold">{t("settings.muted")}</h2>
        {relations.muted.length === 0 && <p className="mt-2 text-neutral-500">{t("settings.nobodyMuted")}</p>}
        {relations.muted.map((person) => (
          <p key={person.id} className="mt-2">@{person.username}</p>
        ))}
      </section>
      {message && <p className="px-4 pb-6 text-sm text-[#3dd68c]">{message}</p>}
      {error && <p className="px-4 pb-6 text-sm text-[#ff5d73]">{error}</p>}
    </div>
  );
}
