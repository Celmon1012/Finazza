# Staff one-tap login (`/login2`)

Hidden page for your team to jump between seeded demo accounts and post as different people.

## Enable

1. Pick a long random secret (not a password users know).
2. **Vercel → Environment Variables** (Production + Preview):

   - `STAFF_LOGIN_SECRET` = your secret  
   - Optional: `DEMO_PASSWORD` = `password123` (default; must match seeded hashes)

3. Redeploy.
4. Locally, add the same to `apps/api/.env` and restart the API.

## Use

1. Open `https://finazza.vercel.app/login2`
2. Enter the staff key (or use `https://finazza.vercel.app/login2?key=YOUR_SECRET` once)
3. Tap **Alex**, **Jordan**, **Sam**, or **Admin** → signed in as that account
4. Post, then Lock again / log out and pick another

Accounts (seed password `password123`):

| Tap | Username | Email |
| --- | --- | --- |
| Alex Morgan | alex | alex@finazza.dev |
| Jordan Lee | jordan | jordan@finazza.dev |
| Sam Rivera | sam | sam@finazza.dev |
| FINAZZA Admin | admin | admin@finazza.dev |

Public `/login` is unchanged. Do not link `/login2` from the public nav.
