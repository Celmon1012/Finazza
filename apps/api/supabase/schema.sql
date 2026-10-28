-- FINAZZA schema. Paste this whole file into the Supabase SQL editor and run it.
-- Dashboard: https://supabase.com/dashboard/project/cbnsmwinlqcxxrjsbcop/sql/new
-- Demo password for every seeded account: password123

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  location text not null default '',
  website text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  suspended boolean not null default false,
  message_privacy text not null default 'everyone' check (message_privacy in ('everyone', 'followers')),
  notification_settings jsonb not null default '{"likes":true,"replies":true,"reposts":true,"follows":true,"mentions":true,"chat":true,"moderation":true}'::jsonb,
  blocked_user_ids uuid[] not null default '{}',
  muted_user_ids uuid[] not null default '{}',
  accepted_terms_at timestamptz,
  reset_token_hash text,
  reset_token_expires timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  reply_to uuid references public.posts(id) on delete set null,
  repost_of uuid references public.posts(id) on delete set null,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  repost_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  timeline_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  asset_class text not null check (asset_class in ('stock', 'etf', 'commodity', 'collectible', 'other')),
  category text,
  asset_name text not null,
  record_type text not null check (record_type in ('trade', 'holding')),
  quantity numeric not null,
  unit text not null,
  buy_price numeric not null,
  sell_price numeric,
  price_unit text not null,
  buy_date timestamptz not null,
  sell_date timestamptz,
  notes text not null default '',
  return_percent numeric,
  profit_per_unit numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists investments_owner_idx on public.investments (owner_id);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null unique references public.investments(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  file_name text not null,
  mime_type text not null,
  redaction_confirmed boolean not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('topic', 'dm', 'group')),
  name text not null default '',
  slug text,
  description text not null default '',
  created_by uuid not null references public.profiles(id),
  last_message_at timestamptz,
  last_message_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists conversations_topic_slug_idx on public.conversations (slug) where type = 'topic';

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '',
  image_url text,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table if not exists public.read_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like', 'reply', 'repost', 'follow', 'mention', 'chat', 'moderation')),
  text text not null,
  link text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'message', 'proof', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'misleading', 'harassment', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists investments_updated_at on public.investments;
create trigger investments_updated_at before update on public.investments for each row execute function public.set_updated_at();
drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.investments enable row level security;
alter table public.proofs enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.read_states enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

revoke select (password_hash, reset_token_hash, reset_token_expires) on public.profiles from anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'follows', 'posts', 'likes', 'reposts', 'investments', 'proofs',
    'conversations', 'conversation_members', 'messages', 'read_states', 'notifications', 'reports'
  ]
  loop
    execute format('drop policy if exists "app access" on public.%I', t);
    execute format(
      'create policy "app access" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Demo accounts. Password for each: password123
insert into public.profiles (id, email, username, password_hash, display_name, role, bio, accepted_terms_at)
values
  ('11111111-1111-4111-8111-111111111111', 'admin@finazza.dev', 'admin', '$2a$12$Swz/m8nfiXP2m7QfEj8zhOwm4QBCHW1OPTxvZNq7a2QIbJoomHKrO', 'FINAZZA Admin', 'admin', 'Moderation', now()),
  ('22222222-2222-4222-8222-222222222222', 'alex@finazza.dev', 'alex', '$2a$12$Swz/m8nfiXP2m7QfEj8zhOwm4QBCHW1OPTxvZNq7a2QIbJoomHKrO', 'Alex Morgan', 'user', 'Portfolio snapshot', now()),
  ('33333333-3333-4333-8333-333333333333', 'jordan@finazza.dev', 'jordan', '$2a$12$Swz/m8nfiXP2m7QfEj8zhOwm4QBCHW1OPTxvZNq7a2QIbJoomHKrO', 'Jordan Lee', 'user', 'Charts and messages', now()),
  ('44444444-4444-4444-8444-444444444444', 'sam@finazza.dev', 'sam', '$2a$12$Swz/m8nfiXP2m7QfEj8zhOwm4QBCHW1OPTxvZNq7a2QIbJoomHKrO', 'Sam Rivera', 'user', 'Collectibles', now())
on conflict (email) do nothing;

insert into public.follows (follower_id, following_id)
values
  ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'),
  ('22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444'),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222'),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222')
on conflict (follower_id, following_id) do nothing;

insert into public.posts (id, author_id, text)
values (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  'Added 5 kg of silver bullion. The receipt is public proof, with the dealer details removed.'
)
on conflict (id) do nothing;

insert into public.conversations (id, type, name, slug, description, created_by)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'topic', 'Stocks & ETFs', 'stocks-etfs', 'Listed shares and funds.', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'topic', 'Commodities', 'commodities', 'Metals, energy, and other physical positions.', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'topic', 'Derivatives', 'derivatives', 'Options, futures and other types of derivatives.', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'topic', 'Collectibles', 'collectibles', 'Cards, coins, watches, and anything catalogued by hand.', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'topic', 'General', 'general', 'Everything that does not fit a room yet.', '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;
