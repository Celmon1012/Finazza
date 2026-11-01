# Google login — setup guide

Google sign-in will not work until **all three** of these are done:

1. Database migration (you may already have this)
2. Google Cloud OAuth client
3. `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` on Vercel (and locally), then redeploy

---

## Step 1 — Database (once)

1. Open Supabase → your FINAZZA project → **SQL Editor** → New query  
   https://supabase.com/dashboard/project/cbnsmwinlqcxxrjsbcop/sql/new
2. Paste and **Run** the contents of `apps/api/supabase/google-auth-migration.sql`:

```sql
alter table public.profiles alter column password_hash drop not null;
alter table public.profiles add column if not exists google_sub text;
create unique index if not exists profiles_google_sub_key on public.profiles (google_sub) where google_sub is not null;
```

You should see “Success”. If it says the column already exists, that is fine.

---

## Step 2 — Google Cloud OAuth client

1. Open https://console.cloud.google.com/ and pick (or create) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `FINAZZA`
   - User support email: your email
   - Developer contact: your email
   - Save and continue through scopes (default is enough) and test users if asked
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `FINAZZA web`
4. **Authorized JavaScript origins** — add exactly:
   - `https://finazza.vercel.app`
   - `http://localhost:3000`
5. **Authorized redirect URIs** — add exactly:
   - `https://finazza.vercel.app/api/auth/google/callback`
   - `http://localhost:4000/api/auth/google/callback`
6. Click **Create**. Copy:
   - **Client ID** (looks like `….apps.googleusercontent.com`)
   - **Client secret**

If Google later shows “redirect_uri_mismatch”, the redirect URI in Google Console does not match the one above exactly (no trailing slash).

---

## Step 3 — Vercel environment variables

1. Open Vercel → your **finazza** project → **Settings → Environment Variables**
2. Add for **Production**, **Preview**, and **Development**:

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | (paste Client ID) |
| `GOOGLE_CLIENT_SECRET` | (paste Client secret) |

3. Confirm these already exist and point at production:

| Name | Value |
| --- | --- |
| `APP_URL` | `https://finazza.vercel.app` |
| `API_PUBLIC_URL` | `https://finazza.vercel.app` |
| `CLIENT_ORIGIN` | `https://finazza.vercel.app` |

4. **Redeploy** after saving (Deployments → … → Redeploy, or push a new commit). Env vars are only picked up on a new deploy.

---

## Step 4 — Local development (optional)

In `apps/api/.env` add:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
API_PUBLIC_URL=http://localhost:4000
APP_URL=http://localhost:3000
```

Restart the API (`:4000`) and Next (`:3000`). The Google button talks to `http://localhost:4000/api/auth/google`.

---

## Step 5 — Test

1. Open https://finazza.vercel.app/login
2. Click **Continue with Google**
3. Pick a Google account
4. You should land on **Home** signed in

**Register with Google** is the same button on `/register` — first visit creates the account (username is auto-generated; change it later in Settings).

Email + password register/login still work as before.

---

## Common errors

| Message | Fix |
| --- | --- |
| Google sign-in is not configured yet | Missing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Vercel, or forgot to redeploy |
| redirect_uri_mismatch | Add `https://finazza.vercel.app/api/auth/google/callback` in Google Console |
| Database is not ready for Google sign-in | Run Step 1 SQL |
| This account uses Google sign-in | That email was created via Google — use the Google button, not a password |

---

## How it works (short)

User → Google → FINAZZA callback → short-lived code → browser exchanges for the normal FINAZZA JWT (`finazza_token`). No Supabase Auth migration.
