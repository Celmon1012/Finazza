# Staff one-tap login (`/login2`)

Switch between **site owner** accounts and **demo personas** without typing passwords.

## Who can open it

Sign in at `/login` as:

- `ibneyousaf86@gmail.com`
- `waikintse2@ln.hk`

Then open https://finazza.vercel.app/login2

Optional: set `STAFF_LOGIN_SECRET` on Vercel to unlock with a shared key instead.

## What you can tap

**Site owners**

- `ibneyousaf86@gmail.com`
- `waikintse2@ln.hk`

(Each address must already have a FINAZZA profile — sign in once with Google/email if you see “not registered yet”.)

**Demo personas** (for filling the feed)

- Alex / Jordan / Sam / Admin (`*@finazza.dev`)

## Flow

1. Sign in as a site owner  
2. Open `/login2`  
3. Tap the account you want  
4. You land on Home as that user  

Do not link `/login2` from the public nav.
