# Progress & continuation guide — Bright Future Basic School SMS

**Purpose of this file:** you're a fresh Claude Code session picking this project up in a
new context window. Read this top to bottom before touching anything — it tells you what
exists, what's proven to work, what's deliberately left undone, and what the user was
mid-conversation about when the last session ended.

Also read [`SMS-PRD.md`](SMS-PRD.md) (the original spec) and [`HANDOFF.md`](HANDOFF.md)
(an earlier, now partially-superseded snapshot — this file is the current one).

## 1. What this project is

A full school management system for a Ghanaian basic school (creche–JHS), built for
**Bright Future Basic School** (placeholder branding — see §6). Four portals: Staff
(admin/teacher/kitchen, auto-detected by account), and Student & Parent (also
auto-detected). Monorepo: `/client` (React 18 + Vite + Tailwind v4 + TanStack Query +
Recharts) and `/server` (Node/Express + `pg`, plain-SQL migrations, no ORM).

**Everything in `SMS-PRD.md` is built.** All 7 planned phases (foundation, people,
attendance, grading, fees, comms, polish) shipped and were verified against the PRD's
§9 acceptance criteria. Since then there have been several rounds of feature additions,
hardening, and UI polish — see §4 for the full chronological log.

## 2. Repo / environment state right now

- Git: `main` branch, 8 commits, all pushed to
  `https://github.com/berryx889/school-management-system.git`. Working tree was clean
  as of the last session.
- Local dev DB: Homebrew Postgres 16 running on **port 5433** (not 5432 — deliberately
  avoids Postgres.app's macOS GUI permission dialog, which blocks headless/CLI
  connections entirely). Database name `sms_dev`. Start command if it's not running:
  ```
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
  export LC_ALL="en_US.UTF-8"   # without this, postgres fails to start on this Mac
  pg_ctl -D /opt/homebrew/var/postgresql@16 -o "-p 5433" -l /tmp/pg16.log start
  ```
- Local `.env` `DATABASE_URL` uses the Unix socket form
  (`postgresql://<mac-username>@/sms_dev?host=/tmp&port=5433`), not TCP — also to dodge
  the Postgres.app dialog.
- Dev servers: `.claude/launch.json` defines `server` (:4000) and `client` (:5174 — port
  5173 is usually taken by an unrelated project on this machine, Vite falls back
  automatically). Use the `preview_start` tool with `{name: "server"}` /
  `{name: "client"}`, not raw Bash, to run them.
- **Production Postgres (Neon) is provisioned and schema-migrated, but the connection
  string is NOT saved anywhere on disk** — this was deliberate (see §7, security note).
  The user will need to paste it again if you're continuing Neon-related work.

## 3. Demo / test accounts (local dev DB only)

| Portal | Username | Password | Role |
|---|---|---|---|
| Staff | `admin` | `admin123` | admin |
| Staff | `teacher1` | `teacher123` | teacher (Mrs. Abena Owusu, class teacher of JHS 2) |
| Staff | `kitchen` | `kitchen123` | kitchen |
| Student & Parent | `STU0001` | `student123` | student (Kofi Mensah) |
| Student & Parent | `233200000099` | `parent123` | parent (Mr. Kwame Mensah) |

Re-seed with `node server/seed.js` (idempotent — checks before inserting).
Run migrations with `node server/migrations/run.js` (idempotent, tracks applied files
in a `schema_migrations` table).

## 4. Chronological build log

### Phase 1–7 (initial build, one session)
Foundation → People → Attendance → Grading → Fees → Comms → Polish, per the PRD's own
build order. Auth (JWT + bcrypt), all CRUD, QR + manual attendance with the "QR never
downgraded by manual" precedence rule, marks entry with server-side teacher-ownership
enforcement, grade computation, printable report cards/broadsheet/receipts/QR ID cards,
Paystack + Arkesel integration (coded fully, no live keys), parent-teacher chat,
progress charts. Verified against every PRD §9 acceptance criterion via live tests
(not just reasoning about the code).

### Icon system overhaul
User feedback: "UI/UX doesn't look clean." Root cause diagnosed by screenshotting the
running app: ~40 raw emoji were being used as the entire icon system (nav, stat cards,
buttons, empty states) — inconsistent rendering, read as unpolished. Built
`client/src/components/Icon.jsx`, a ~35-icon consistent stroke-SVG set
(currentColor-based), swept every usage across all 4 portals. Also fixed an uneven
7-card stat grid on the admin dashboard (4+3 orphan row → clean two rows).

### Hardening round
- `xlsx` (SheetJS) was stuck on npm's unpatched 0.18.5
  (GHSA-4r6h-8v6p-xvw6, prototype pollution/ReDoS — fix never republished to npm).
  Now installs 0.20.3 directly from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
  `npm audit`: 0 vulnerabilities.
- Added `server/tests/` (Node's built-in `node --test`, no new dependency):
  `attendance-precedence.test.js` and `marks-ownership.test.js`, 7 tests covering the
  two rules with real correctness/security consequences if silently regressed. Extracted
  `server/app.js` (Express app, no `.listen()`) from `server/index.js` so tests can spin
  up an ephemeral-port instance of the real app against the real dev DB, with
  self-contained fixture setup/teardown. **Run with `npm test` from `/server`.**

### Reference-driven feature additions
User pointed at screenshots of a different (PHP-based) school system for ideas, asked
which to adopt:
- **Promote/repeat students** (`client/src/pages/admin/PromoteStudents.jsx`,
  `POST /api/students/promote`) — was already promised in PRD §5.2 but never built.
  Bulk-move a class roster to a target class; unchecked students stay behind (repeat).
- **Attendance**: "All Present"/"All Absent" bulk buttons + a per-student remarks field
  (new `attendance.remark` column, migration 002).
- **Subjects**: core/elective classification (new `subjects.type` column) + expanded
  seed list to 11 subjects matching a real Ghanaian JHS curriculum (was 4).
- **Students**: CSV export alongside the existing Excel import.
- **Admin dashboard**: owing-students count, results-published count, SMS-sent count,
  enrollment-by-class bar chart.
- **Fees/Debtors**: a "quick payment" search box (find any student, record a payment,
  without first navigating through the filtered debtors list).
- Caught and fixed a self-inflicted test bug in the same round: expanding the subject
  list broke `marks-ownership.test.js`'s assumption that `class_subjects[0]` was always
  owned by the seeded teacher (alphabetical sort put an unassigned subject first once
  there were 11 subjects instead of 4). Fixed to resolve ownership explicitly.

### Grading scale made admin-configurable
Settings → Grade bands is now a fully editable table (add/remove/edit rows) with
one-click presets for GES 1–6 or WASSCE/BECE A1–F9. Saves atomically via
`PUT /api/settings/grade-bands` (replace-all in a transaction) with server-side
validation (0–100 ranges, no overlaps, no blank grade/remark). Verified the broadsheet
computation picks up a scale change immediately (switched to A1–F9 live, confirmed a
0-score subject reports "F9"/"Fail").

### Login page redesign
User wanted: a splash/description screen before login, "Staff" and "Student & Parent"
as the only two options (not 4 separate role tiles), admin auto-detected when logging in
via Staff (no manual role picker), animations, reference: smartschoolgh.com.

Backend: `POST /api/auth/login` changed from `{username, password, role}` to
`{username, password, portal}` where `portal` ∈ `staff` (→ admin/teacher/kitchen) or
`family` (→ student/parent) — since `username` is globally unique across all roles, the
server just resolves whichever exact role matches within that portal's allowed set. No
role-picking UI needed anywhere. `PORTAL_ROLES` mapping lives in `server/routes/auth.js`.

Frontend: `client/src/pages/Login.jsx` fully rebuilt — splash (logo, eyebrow school
name, "Welcome"/"Welcome back, {name}" via a `sms_last_user` localStorage cache, a
rotating feature-highlight ticker, staggered fade-in entrance) → portal picker (2 cards)
→ portal-specific login form. OTP flow (parent SMS code) preserved, now portal-scoped
too.

Iterated twice more on user feedback: first pass had floating badge cards that
overlapped hero text at some sizes and a "School management, simplified" marketing pill
that read as generic SaaS copy rather than the school's own portal — replaced with a
clean staggered entrance + single rotating ticker line (crossfades every ~2.8s, no
overlap) and a plain school-name eyebrow label. Also added a `PasswordInput` component
(eye/eye-off toggle, `client/src/components/ui.jsx`) used everywhere a password is typed.

### Password-change flow (most recent work)
Triggered by actually setting up the production admin account and realizing
`must_change_password` was set on new accounts but **nothing in the app ever let a user
change their password** — pure decoration on the flag.

- `server/routes/account.js`: `POST /api/account/change-password` (self-service; skips
  the current-password check only for a forced first-time change) and
  `POST /api/account/reset-password/:userId` (admin-only, generates a fresh temp
  password, sets `must_change_password=true`).
- `client/src/components/ChangePassword.jsx`: shared form, used both as a full-screen,
  non-dismissible `ForcedPasswordGate` (wired into `ProtectedRoute` — blocks all routes
  for any role when `must_change_password` is true) and as a voluntary modal.
- Discovered and fixed a second gap while wiring this up: **student/parent portals had
  no sign-out mechanism at all.** `MobileLayout` had no header/menu of any kind. Added a
  minimal header with an avatar button opening an account menu (change password +
  sign out). `SidebarLayout` (admin/teacher/kitchen) got a "Change password" button next
  to the existing "Sign out".
- Admin can trigger a reset from the Teachers and Students tables; the temp password is
  shown once in a copyable modal (not a toast — a toast auto-dismisses too fast to
  copy a password from).
- Also hardened `AuthContext`'s `localStorage` read with a try/catch — found during
  testing that a malformed `sms_user` value crashes the *entire app* to a blank white
  screen with zero recovery path (no error boundary catches it, since the crash is in
  the provider wrapping the whole router). Now clears the bad value and treats it as
  logged-out instead of crashing.
- **Verified end-to-end in the browser**: created a throwaway teacher, reset their
  password via the admin UI's flow, logged in with the temp password, confirmed the
  forced gate blocks all navigation, completed the change, confirmed normal app access
  resumes immediately. All 7 automated tests still pass.

## 5. Production database (Neon) — current state

- A Neon Postgres project exists and both migrations have been applied (schema is live,
  matches local dev exactly).
- One admin account exists: username `admin`, role `admin`, `must_change_password=true`.
  A temporary password was generated and shown to the user in chat — **it may or may not
  still be valid**; if the user has since logged in and completed the forced
  password-change flow (now that it actually works), that temp password is gone and
  they've set their own. Don't assume it still works — ask, or just have them use "reset
  password" via a future admin session once the app is deployed.
- `school_settings` still has the placeholder branding ("Bright Future Basic School",
  Accra address, etc.) inserted by the migration itself. User explicitly said **they'll
  edit all of this themselves via the Settings page** once they can log in — don't
  invent real school details for them.
- No seed/demo data was put on Neon (user chose "just a real admin account" when asked).

## 6. What's NOT done — don't assume, check with the user

1. **Not deployed anywhere.** No Vercel project, no Render service. The Neon DB exists
   in isolation; there's no live URL for the user to actually use the app yet. This is
   the most likely "what's next" if the user wants to keep moving forward — needs their
   Vercel/Render accounts, not something you can provision unilaterally.
2. **Paystack & Arkesel keys are blank.** Both integrations are fully coded
   (`server/services/paystack.js`, `server/services/sms.js`) and read from `.env`.
   Payments show "not configured" to parents; SMS sends log to `sms_log` with status
   `not_configured` instead of delivering. Needs real keys from the user when they're
   ready to go live with payments/SMS.
3. **School branding is still placeholder**, on both local dev and Neon. User will edit
   via Settings themselves.
4. **Cloudinary not implemented.** Student/staff photos store as base64 directly in
   Postgres (PRD's own v1 scope). Only matters if real photo uploads are used at real
   scale (see the Neon-storage-budget conversation in this session's history — with
   avatars-only/no real photos, this isn't a near-term concern; the dominant long-term
   storage driver is accumulating daily attendance rows, not photos, if photos are
   avoided). Was flagged twice as a "fix before scale" item; user hasn't asked for it yet.
5. **No self-service "forgot password" for a user who's locked out and can't reach an
   admin** — the SMS OTP flow covers parents (and anyone else with a phone on file), but
   there's no "forgot password" link on the login form itself, just the existing "sign
   in with SMS code instead" option on the family portal. Not flagged as broken, just
   noting it's the only recovery path.
6. Deliberately out of scope per the PRD: transport tracking, library management,
   payroll/HR, multi-tenancy.

## 7. Security notes for whoever continues this

- The Neon connection string was pasted into chat by the user and used only as a
  one-off `DATABASE_URL=... node ...` environment override for migrations/admin setup —
  **never written to `.env`, `.env.production`, or any tracked file.** This was
  deliberate, not an oversight. If you need to touch the Neon DB again, ask the user for
  the connection string again rather than assuming it's saved somewhere.
- `.gitignore` covers `.env` (exact match only, not `.env.*` — be careful if you ever
  create a differently-named env file for Neon/production, it will NOT be auto-ignored).
- Git commits in this repo show the committer as `BERRY SEPTEMBER <...@...local>`,
  auto-detected from the machine. The user asked earlier to change this but it requires
  `git config --global`, which is a hard boundary — cannot be done by the agent, only
  by the user themselves.

## 8. How to verify things still work after picking this back up

```bash
# Terminal 1: Postgres (if not already running)
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"; export LC_ALL="en_US.UTF-8"
pg_ctl -D /opt/homebrew/var/postgresql@16 -o "-p 5433" -l /tmp/pg16.log start

# Terminal 2: automated tests (run from /server)
npm test    # expect 7/7 passing

# Dev servers: use the preview_start tool with {name:"server"} and {name:"client"},
# not raw Bash — .claude/launch.json already defines both.
```

Then log in locally with the demo accounts in §3 and click around — the app is fully
functional end to end on local dev right now.
