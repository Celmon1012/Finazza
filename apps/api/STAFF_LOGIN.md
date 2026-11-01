# Staff one-tap login (`/login2`)

Hidden page so site owners can jump into seeded demo accounts and post as different people.

## Who can use it

**Staff emails (preferred):**

- `ibneyousaf86@gmail.com`
- `waikintse2@ln.hk`

These are the same site-owner emails that get the Admin role.

**Optional shared key:** `STAFF_LOGIN_SECRET` on the server (if set).

## How to use (staff email)

1. Sign in at `/login` (Google or password) as `ibneyousaf86@gmail.com` or `waikintse2@ln.hk`
2. Open https://finazza.vercel.app/login2
3. Tap **Alex**, **Jordan**, **Sam**, or **Admin**
4. You are signed in as that demo account — post, then return to `/login2` while still a… wait — after switching you are no longer the staff email.

After you enter a demo account, to switch again either:

- Log out → sign in again as a staff email → `/login2`, or
- Use the staff key unlock if `STAFF_LOGIN_SECRET` is set

## Optional staff key

Vercel env (Production + Preview):

- `STAFF_LOGIN_SECRET` = long random string  
- `DEMO_PASSWORD` = `password123` (default; must match seed)

Then `/login2` can unlock with that key without signing in as staff first.

## Demo accounts

| Tap | Username | Email |
| --- | --- | --- |
| Alex Morgan | alex | alex@finazza.dev |
| Jordan Lee | jordan | jordan@finazza.dev |
| Sam Rivera | sam | sam@finazza.dev |
| FINAZZA Admin | admin | admin@finazza.dev |

Do not link `/login2` from the public nav.
