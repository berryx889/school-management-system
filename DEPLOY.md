# Deploying OUR WORLD MODEL SCHOOL

Architecture: **Vercel** (frontend) → **Render** (Express API) → **Neon** (Postgres).
The browser only ever talks to the Vercel URL; Vercel proxies `/api/*` to Render, so there
are no CORS issues and no client code changes.

Do these in order. You'll need free accounts at neon.tech, render.com and vercel.com.

---

## 1. Database — Neon

1. Create a project at [neon.tech]. Pick a region close to your users.
2. Copy the **Pooled** connection string. It looks like:
   `postgresql://<user>:<password>@<host>-pooler.neon.tech/<db>?sslmode=require`
3. Keep it handy — you'll paste it into Render as `DATABASE_URL`. **Never commit it.**

> Single-school note: RLS is a dormant safety net here (one school = no cross-tenant risk),
> so one connection string for everything is fine. You do **not** need the `sms_app` role.

---

## 2. API — Render

**Option A — Blueprint (uses `render.yaml`):**
1. Render → **New** → **Blueprint** → connect this GitHub repo. It reads `render.yaml`.
2. When prompted, fill the secret env vars:
   - `DATABASE_URL` = your Neon pooled string
   - `CLIENT_URL` = your Vercel URL (you'll get it in step 3 — you can set a placeholder now and update after)
   - `JWT_SECRET` is auto-generated; `PAYSTACK_SECRET_KEY` / `ARKESEL_API_KEY` can stay empty.
3. Deploy. The build runs `npm install && npm run migrate` (creates all tables), then starts the server.

**Option B — manual Web Service:**
- Root Directory: `server` · Build: `npm install && npm run migrate` · Start: `npm start`
- Add the same env vars as above. Health check path: `/api/health`.

**Seed the first admin (once):** open the Render service **Shell** and run:
```
npm run seed
```
This creates login `admin` / `admin123` plus demo data. **Change that password immediately**
after first sign-in (or seed, then delete the demo students/teachers from Trash).

Copy your Render URL, e.g. `https://sms-server-xxxx.onrender.com`.

> Free tier spins down after ~15 min idle, so the first request after a lull takes ~50s. Fine
> for a small school; upgrade to a paid instance to keep it always-on.

---

## 3. Frontend — Vercel

1. Edit **`client/vercel.json`** and replace `YOUR-RENDER-APP.onrender.com` with your real
   Render host from step 2. Commit + push.
2. Vercel → **Add New Project** → import this repo.
3. Set **Root Directory** to `client`. Framework preset auto-detects **Vite** (Build `vite build`,
   Output `dist`). No environment variables are needed.
4. Deploy. Vercel gives you a URL like `https://our-world-model-school.vercel.app`.
5. Back in Render, set `CLIENT_URL` to that Vercel URL and redeploy (or just save — it only
   affects CORS headers).

---

## 4. First run

1. Open the Vercel URL → **Sign in** → Staff → `admin` / `admin123`.
2. **Change the admin password** (Account security, sidebar footer gear).
3. **Settings → Branding**: the purple/gold brand and school name are the defaults; upload your
   logo and adjust if needed.
4. **Academic → Academic terms**: “Set up academic year”.
5. Add classes, subjects, teachers/staff, then students (Students → Import Excel for bulk).

---

## Environment variables (reference)

| Where  | Key                  | Value                                             |
|--------|----------------------|---------------------------------------------------|
| Render | `DATABASE_URL`       | Neon pooled connection string                     |
| Render | `JWT_SECRET`         | long random string (Render auto-generates)        |
| Render | `NODE_ENV`           | `production`                                       |
| Render | `CLIENT_URL`         | your Vercel URL                                    |
| Render | `PAYSTACK_SECRET_KEY`| (optional) enables fee payments                   |
| Render | `ARKESEL_API_KEY`    | (optional) enables SMS / OTP login & reset codes  |

Vercel needs **no** env vars — the `/api` rewrite in `client/vercel.json` points it at Render.

---

## Onboarding another school later

Clone the repo, create that school its own Neon DB + Render service + Vercel project with its
own env vars, run migrations + seed, then set its name/logo/colours in Settings. One codebase,
one deployment per school.
