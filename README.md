# Property Website — Supabase-Only Setup

Firebase is completely removed now. Auth + Database + Storage — sab kuch Supabase mein hai.
Ye recurring "authorized domain" wala masla bhi khatam ho gaya hai, kyunki Supabase
domain verify nahi karta — ye sirf URL + API key check karta hai, chahe request kisi bhi
website se aaye. Isliye jab bhi aap repo/domain change karein, kuch bhi dobara verify
karne ki zaroorat nahi.

## Step 1 — Run the database setup (one time)

1. Supabase Dashboard kholein → apna project select karein
2. Left sidebar mein **SQL Editor** → **New query**
3. `supabase-setup.sql` file ka pura content copy-paste karein
4. **Run** dabayen — ye sare tables (listings, categories, offers, notifications,
   site_settings, admin_profile) aur unki security policies bana dega

## Step 2 — Create the admin login (replaces Firebase Auth user)

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Email + password daalein (jo aap admin panel mein login karne ke liye use karenge)
3. **"Auto Confirm User"** ka toggle ON rakhein (taake email verify karne ki zaroorat na ho)
4. Save/Create kar dein

Bas — yehi email/password ab `admin.html` pe login karne ke liye use hoga.

## Step 3 — Confirm Storage bucket

Aapka `property-media` bucket already public hai (pehle se set hai). Agar upload
fail ho to `supabase-setup.sql` ke aakhri 2 lines (storage policies) ko alag se
SQL Editor mein run kar dein.

## Step 4 — Upload files to GitHub

Apni repo (`Property-site`) mein ye files daalein — **sab files repo ke root mein
honi chahiye**, kisi folder ke andar nahi:

- `index.html`
- `admin.html`
- `app-public.js`
- `app-admin.js`
- `style.css`
- `supabase-config.js`

**`firebase-config.js` ab bilkul zaroorat nahi — agar repo mein pehle se hai to
usko delete kar dein** (koi masla nahi agar reh bhi jaye, bas unused file hogi).

## Step 5 — Enable GitHub Pages (agar naya repo hai to dobara karna hoga)

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. **Save**

Kuch minute mein site live ho jayegi:
- Public site: `https://infocryptofeed-glitch.github.io/Property-site/index.html`
- Admin panel: `https://infocryptofeed-glitch.github.io/Property-site/admin.html`

(Agar repo naam ya username change ho jaye, in dono links ka sirf beech wala
part badlega — baaki kuch reconfigure nahi karna, kyunki Supabase mein
koi domain whitelist nahi hoti.)

## Why login was failing before (Firebase)

Firebase Auth sirf "Authorized domains" list mein maujood domains se hi login
allow karta tha — repo/domain change hote hi wo list dobara set karni padti thi.
Supabase mein aisi koi list hi nahi hai, is liye ye pura category ka bug ab
permanently khatam ho gaya hai.

## Reusability for future clients

Har naye client ke liye: ek naya Supabase project banayein, upar wala SQL run
karein, ek admin user add karein, `supabase-config.js` mein us naye project ka
URL + anon key daalein — baaki sab files hooba-hoo reuse ho jayengi.
