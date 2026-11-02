-- Optional. Locale already persists today via profiles.notification_settings._locale.
-- Run this only if you want a first-class profiles.locale column as well.
-- Dashboard: https://supabase.com/dashboard/project/cbnsmwinlqcxxrjsbcop/sql/new

alter table public.profiles
  add column if not exists locale text not null default 'en'
  check (locale in ('en', 'zh-HK'));

update public.profiles
set locale = coalesce(notification_settings->>'_locale', 'en')
where coalesce(notification_settings->>'_locale', 'en') in ('en', 'zh-HK');
