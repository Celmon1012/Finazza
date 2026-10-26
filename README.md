# FINAZZA

Investment social network for stocks, ETFs, commodities, and collectibles. This is the web MVP from the October 2026 roadmap: an X-style feed, investment records, public proof uploads, topic rooms, direct messages, group chats, and a notification centre.

The optional chart annotator is included. Native mobile apps are not.

## Stack

| Layer | Choice |
| --- | --- |
| Web | Next.js, React, TypeScript, Tailwind |
| API | Node.js, Express, TypeScript, Zod |
| Data | Supabase Postgres |
| Auth | JWT, bcrypt |
| Realtime | Socket.IO |
| Files | Local disk in development. Images are re-encoded and PDF pages are copied so source metadata is dropped. |
| Email | Resend when `RESEND_API_KEY` is set. Otherwise the reset link is logged and shown in development. |

## Run it

```bash
npm install
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

The API stores accounts, posts, investments, chat, and notifications in Supabase. Open the Supabase SQL editor, run `apps/api/supabase/schema.sql`, and set `SUPABASE_URL` plus `SUPABASE_SECRET_KEY` in `apps/api/.env`.

### Demo accounts

Password for every account: `password123`

| Email | What you see |
| --- | --- |
| alex@finazza.dev | Portfolio snapshot, silver proof, unread chat |
| jordan@finazza.dev | Gold chart and a direct message |
| sam@finazza.dev | Collectibles |
| admin@finazza.dev | Reports and topic rooms |

## Week 1 defaults

These were open questions in the roadmap. They are implemented so the app can be reviewed, and they are easy to change.

- Launch rooms: Stocks & ETFs, Commodities, Precious metals, Collectibles, General. Admins can add more.
- Direct messages and invites: everyone, unless the recipient chooses “only people I follow”.
- Group chats: 50 members. The creator is the admin and can add or remove people. Anyone can leave.
- Collectible categories: trading card, coin, watch, art, other.
- Moderation: accounts with the admin role.
- Brand: white background, the supplied orange FINAZZA logo, and a wide three-column layout.

## What the MVP does

- Sign up, sign in, password reset, profiles
- Posts, replies, likes, reposts, follows, explore search
- Holdings and completed trades with flexible units
- Simple price return per unit, before fees and taxes
- Public proof with a redaction checklist and the label “Proof uploaded — not verified by the platform”
- Topic rooms, direct messages, group chats, images, unread counts
- In-app notifications, per-type settings, block, mute, report
- Admin: hide content, suspend, create rooms
- Chart annotator: draw on an uploaded image and post it

Out of this build, on purpose: brokerage connections, proof verification, live market data, email digests, push notifications, voice and video, and mobile apps.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
```
