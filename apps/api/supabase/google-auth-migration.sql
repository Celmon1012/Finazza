-- Run once in the Supabase SQL editor for the live FINAZZA database.
-- Enables Google sign-in: nullable password + google_sub on profiles.
-- Dashboard: https://supabase.com/dashboard/project/cbnsmwinlqcxxrjsbcop/sql/new

alter table public.profiles alter column password_hash drop not null;
alter table public.profiles add column if not exists google_sub text;
create unique index if not exists profiles_google_sub_key on public.profiles (google_sub) where google_sub is not null;
