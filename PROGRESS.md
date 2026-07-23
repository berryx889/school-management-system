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

- Git: `main` branch, working tree **clean** — everything described in §4 is committed
  and **pushed to origin/main**. 16 commits total on main (the original 8 + 9 atomic
  feature commits + 1 PROGRESS.md update + 5 permissions/remarks/staff-directory/nav +
  1 notifications + 1 forgot-password).
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
| Staff | `accountant` | `accountant123` | accountant (finance-only: Debtors, Fee structures) |
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

### Settings: logo upload + brand color (most recent work)
Picked up from this file's own §6 item 3 (school branding). While reviewing the Settings
page to let the user edit branding themselves, found the `school_settings` table already
had `logo_url` and `primary_color` columns and a working `PUT /settings` endpoint accepting
them — but no UI ever exposed either field. `logo_url` was only ever set via raw SQL,
`primary_color` was set but used nowhere in the client at all.

- `client/src/pages/admin/Settings.jsx`: added a `LogoUpload` component (file input →
  `FileReader.readAsDataURL` → base64 data URI stored directly in `logo_url`, capped at
  500KB client-side, image-type validated) with a live preview and a remove button, plus a
  brand-color field (native `<input type="color">` swatch synced with a plain hex textbox).
  Both now included in the form's save payload.
- Made `primary_color` actually do something. First pass: `client/src/pages/shared/ReportCards.jsx`
  and `client/src/pages/shared/Receipt.jsx` headers use `style={{ borderColor: ... }}` with
  the school's `primary_color` instead of a fixed Tailwind class (`server/routes/receipts.js`'s
  query didn't select `primary_color` at all — added it). User then asked whether the brand
  color was supposed to reskin the whole live app, not just printables — it wasn't yet, so
  extended it: `client/src/utils/brandColor.js` generates a 10-stop 50–900 shade ramp from
  the single picked hex (HSL, same hue/saturation, a fixed lightness curve modeled on the
  app's original indigo scale) and writes it onto the `--color-primary-*` CSS custom
  properties that Tailwind v4's `@theme` block in `index.css` already defines — every
  `bg-primary-500`/`text-primary-600`/etc. utility class compiles to `var(--color-primary-500)`,
  so overwriting the variables re-themes the whole app live with zero component/className
  changes. `client/src/components/BrandThemeSync.jsx` (fetches `/settings`, applies on
  change, renders null) is mounted once inside `ProtectedRoute.jsx` so it's live in every
  authenticated portal. Pre-login screens keep the static default since `GET /settings`
  requires auth.
- User uploaded a real logo and reported it "not showing" — it had saved correctly (visible
  in the Settings preview) but nothing else in the app actually rendered `logo_url`; the
  sidebar/mobile header just showed a hardcoded first-letter badge and a literal
  `"Bright Future Basic School"` string, and the Student ID card had the school name
  hardcoded too despite the Settings page's own caption claiming logos show there. Added
  `client/src/hooks/useSettings.js` (thin shared-cache wrapper around the `['settings']`
  query, also now used by `BrandThemeSync`) and wired real logo + `settings.name` into
  `SidebarLayout.jsx`, `MobileLayout.jsx`, and `StudentQrCard.jsx` (falls back to the
  letter-badge/static string while settings are loading or if no logo is set). Verified in
  the browser post-login: sidebar shows the uploaded crest, ID card header shows both logo
  and name at their respective sizes, via `document.querySelectorAll('img')` confirming the
  actual base64 data URI rendered rather than silently falling back.
- Follow-up: user then noticed the logo (and school name) still didn't show on the
  pre-login splash screen (`client/src/pages/Login.jsx`) — expected, since `GET /settings`
  requires auth and nobody's signed in yet there, but a real gap. Added
  `GET /api/settings/public` (`server/routes/settings.js`, no `requireAuth`) returning only
  non-sensitive branding fields (`name`, `short_name`, `logo_url`, `primary_color`,
  `motto` — deliberately not the operational fields like grading weights or attendance
  cutoffs). `client/src/hooks/usePublicBranding.js` is the unauthenticated counterpart to
  `useSettings`; wired into `Login.jsx`'s `Splash` component (logo/name with the same
  letter-badge fallback as everywhere else) and also calls `applyBrandColor` so the splash's
  accent color matches what the user picked, before login. Verified in the browser signed
  out: splash shows the real crest and the brand color, no console errors traceable to this
  change.
- Also fixed a demo-data drift found while testing: local dev DB's `teacher1` account had
  `must_change_password=true` and a password other than the documented `teacher123`
  (almost certainly from earlier hands-on testing of the password-reset admin flow in the
  previous session), which was silently failing 4 of 7 `server/tests/` cases with a
  confusing `Cannot read properties of undefined (reading 'id')` rather than an obvious
  auth error. `seed.js`'s `upsertUser` skips existing usernames entirely, so re-running the
  seed does not fix this class of drift — restored by hand via a direct
  `UPDATE users SET password_hash=..., must_change_password=false`. Worth knowing if this
  happens again: check a raw login curl before assuming a real regression.
- **Verified end-to-end in the browser**: uploaded a real logo via the `/settings` API
  (browser tab automation can't drive OS file pickers, so exercised the exact same
  save/display code path directly against `PUT /api/settings`), confirmed it rendered in the
  Settings preview after reload, edited the brand color through the actual rendered form
  and clicked the real Save button, confirmed the new color persisted to Postgres. Confirmed
  the CSS-variable override mechanism directly in devtools (verified Tailwind v4 utilities
  really do reference `var(--color-primary-500)`, not an inlined literal), then confirmed
  the live app (dashboard, nav, buttons) actually re-themed after logging in fresh with a
  non-default color set. Reset test values back to blank/default afterward since the user
  wants to enter their real logo and color themselves later (see §6 item 3 — still applies,
  now with a working UI + live reskin for it). All 7 automated tests still pass.
  Note: while testing, the local dev DB's `primary_color`/`logo_url` were briefly seen set to
  values this session didn't set (`#f72222` + a large logo) — another concurrent session was
  using the same shared local dev DB/dev server at the same time. Didn't overwrite it in case
  it was in-progress work from that session; if you see unexpected branding values in local
  dev, that's likely why — check before assuming it's a bug.

### Five-phase feature build: accountant role, branding depth, academic structure, finance, promotion policy
User shared 3 screen-recorded videos of a competing product ("CampusSphere"/"StagesSchool",
a multi-tenant SaaS platform) and asked for a frame-by-frame feature comparison. No native
video support in this environment — installed `ffmpeg` via Homebrew, extracted frames at
scene-change points (hybrid scene-detection + periodic-interval selection to avoid missing
content during continuous scrolling), delegated per-video frame analysis to 3 parallel
subagents (kept ~184 raw images out of the main session's context), then synthesized a
feature-gap list. User chose to build the single-school-relevant subset (not the multi-tenant
SaaS pivot, kept as a separate future discussion) across 5 phases, planned in full via
`EnterPlanMode`/Explore/Plan agents before any code was written — plan saved at
`~/.claude/plans/lucky-tumbling-tulip.md` for reference. Migrations `003`-`007` cover all 5
phases; `002` was the last one before this round.

**Phase 1 — accountant role (migration `003_add_accountant_role.sql`, done):** new
`user_role` enum value `'accountant'` (must be the sole statement in its migration file —
Postgres forbids using a new enum value in the transaction that added it). Added to
`PORTAL_ROLES.staff` in `auth.js`; `requireRole('admin', 'accountant')` on the finance routes
in `fees.js`/`payments.js`. New `/accountant` portal in `App.jsx` (`ACCOUNTANT_NAV`, reuses
the existing `Debtors`/`FeeStructures`/`Receipt` pages — no new components) — mirrors the
`/kitchen` portal's no-dashboard pattern. Seeded `accountant`/`accountant123` in `seed.js`.

Two real gaps found and fixed while verifying live in the browser (both outside the original
plan — plan agents traced `requireRole` calls but missed *inline* role checks that don't go
through that decorator):
- `Debtors.jsx`'s payment-recording flow hardcoded `navigate('/admin/receipts/...')` — under
  `/accountant` this got bounced by `ProtectedRoute` (wrong role prefix). Fixed to
  `` navigate(`/${user.role}/receipts/${id}`) `` using `useAuth()`.
- `GET /students` (used by Debtors' "Quick payment" student search) has an inline
  `if (!['admin','teacher','parent','student'].includes(req.user.role))` check in
  `students.js` — not a `requireRole(...)` call, so it was invisible to the exploration
  agents' grep-for-`requireRole` pass. Added `'accountant'` to that array.
  **Lesson for later phases in this build:** don't trust `requireRole(...)` call sites alone
  as the complete permission surface — some routes gate access with inline role-array checks
  instead. Grep for both patterns when auditing a route file's access rules.
- Verified end-to-end in the browser: logged in as `accountant`, confirmed sidebar shows only
  Debtors/Fee structures, searched a student via Quick Payment, recorded a real payment
  against a real invoice, confirmed the receipt renders correctly at
  `/accountant/receipts/:id` with no redirect bounce. 9/9 automated tests pass (added
  `server/tests/accountant-role.test.js`, 2 new tests; `PORTAL_BY_ROLE` in
  `server/tests/helpers.js` gained `accountant: 'staff'`).

**Phase 2 — branding depth (migration `004_branding_settings.sql`, done):** added
`favicon_url`, `school_seal_url`, `report_card_watermark_url`, `secondary_color`, `theme`,
`font_family` to `school_settings`. Generalized the existing `LogoUpload` component in
`Settings.jsx` into a reusable `ImageUpload({label, value, onChange, helpText})` and added 3
more upload fields plus a secondary-color picker, theme select, and font input. New
`applyFavicon()` in `brandColor.js`, wired into both `BrandThemeSync.jsx` (authenticated) and
`Login.jsx` (pre-login, via the existing `usePublicBranding()`/`GET /settings/public` path —
added `favicon_url` to that endpoint's field list). `ReportCards.jsx` now renders the
watermark (absolute-positioned, `opacity-10`, behind content) and the seal (next to the
signature line). Verified end-to-end in the browser: uploaded a favicon via the API (file
pickers can't be automated in this environment), confirmed the browser tab icon updated both
post-login and pre-login on `/login`; uploaded a seal + watermark, generated a JHS 2 report
card, confirmed both `<img>`s render in the DOM at the right spots. Reset all three back to
blank afterward — same reasoning as the logo/color work above, real values are the user's to
set. No new automated tests (pure additive-field plumbing, already covered by the existing
`PUT /settings` round-trip; visual rendering isn't something `node --test` catches). 9/9
tests still pass.

**Phase 3 — academic structure builder (migration `005_academic_structure.sql`, done):** new
`academic_stages` table plus nullable `classes.stage_id`/`level_number`/`section`/`capacity`
columns (existing rows/code paths untouched — confirmed via the Phase 1/3 exploration that
classes are referenced purely by integer FK everywhere except the XLSX import's name-string
lookup, which is unaffected). New `POST /classes/bulk-generate` (admin-only, transactional)
takes `{stage_name, levels[], sections[], naming_format, capacity_per_class}`, substitutes
`{stage}/{level}/{section}` tokens, case-insensitively skips name collisions with existing
classes (app-level check — `classes.name` still has no DB `UNIQUE` constraint, a pre-existing
gap), and bulk-inserts the rest. New `client/src/pages/admin/StructureBuilder.jsx` (stage
name, add/remove chip lists for levels and sections, naming-format input, capacity, a
client-computed live preview using the same token substitution) — reached via a
"+ Bulk generate" button next to "+ Add class" on `Classes.jsx` at
`/admin/classes/structure-builder`, not added to the sidebar nav (same pattern as the
existing QR-card route). Verified end-to-end in the browser: built a "Primary" stage with 2
levels x 2 sections, confirmed the 4-name live preview, generated, confirmed all 4 classes
appeared on the Classes page and were immediately selectable in Fee Structures' class
dropdown (proving the FK-by-ID reuse claim). Deleted the 4 test classes + stage afterward
(0 students enrolled, safe) — same "don't leave arbitrary test data behind" pattern as the
branding work. Added `server/tests/academic-structure.test.js` (3 tests: correct
level x section cartesian product, collision-skip with no duplicate rows, non-admin 403).
12/12 tests pass.

**Phase 4 — finance additions (migration `006_finance_policy_and_invoice_fields.sql`,
done):** `fee_invoices.due_date`/`discount`, `school_settings.tax_rate`/
`late_fee_grace_days`/`late_fee_percent`. New `server/utils/finance.js` — `getInvoiceBalance()`
is now the single source of truth for balance math, replacing 4 separate duplicated
calculations across `fees.js` (x2), `receipts.js`; late fee is computed on read, never
stored (once `due_date` + grace days has passed, `late_fee_percent`% of the post-discount
outstanding balance is added). `POST /invoices/generate` now applies `tax_rate` to the summed
total and accepts an optional `due_date`. New `PATCH /invoices/:id/discount` (admin +
accountant). `Debtors.jsx` got a "Discount" modal per row (mirrors the existing payment
modal) and a late-fee/discount sub-line under the balance figure; `Receipt.jsx` surfaces both
too. Settings gained a 3-field "tax rate / grace days / late fee %" block inline in the main
form (not a separate sub-editor — small enough to match the `class_score_weight`-style block
rather than the `GradeBandsEditor`-style pattern).

While running the new `finance-policy.test.js`, the full suite intermittently hung for
5 minutes and failed with `UND_ERR_HEADERS_TIMEOUT` — **twice, on two different, unrelated
test files** (once on `finance-policy.test.js` itself, once on the pre-existing
`attendance-precedence.test.js`). Running any single file in isolation always passed in
under 250ms. This ruled out a logic bug — pointed instead at resource contention between
`node --test`'s parallel test-file subprocesses, worsened by this session running a dev
server + heavy browser automation concurrently on the same machine. Confirmed the fix:
`node --test --test-concurrency=1` made the full suite pass reliably in ~1.7s total — trivial
overhead for the reliability gain, so `server/package.json`'s `test` script now always runs
serially. **If you see a similar `HeadersTimeoutError` hang in the future, this is
almost certainly why — don't assume it's a new code bug before checking whether the suite
was run with default (parallel) concurrency.**

Verified end-to-end in the browser: confirmed the 3 new Settings fields render and default
to 0; created a real fee structure + invoice (GHS 800 total from 3 combined structures),
backdated its due date past a 3-day grace period with a 10% late fee configured, applied a
GHS 50 discount via the UI, confirmed Debtors showed "GHS 825" with both the "incl. GHS 75
late fee" and "GHS 50 discount applied" sub-lines exactly as computed; recorded the full
payment and confirmed the receipt showed the discount line and a correctly negative
remaining balance (late fee line correctly omitted once fully covered, since it only applies
while a positive balance remains — logically consistent, not a bug). Cleaned up all test
fixtures and reset settings back to 0 afterward. Added `server/tests/finance-policy.test.js`
(3 tests, using a fully dedicated class/student fixture rather than the shared JHS 2 one,
since `/invoices/generate` sums *all* fee structures for a class — sharing one across
concurrently-run test files would let unrelated tests' fee structures bleed into each
other's expected totals). 15/15 tests pass.

**Phase 5 — promotion/grading policy engine (migration
`007_promotion_policy_settings.sql`, done — final phase of this build):** 8 new
`school_settings` columns (`promotion_pass_mark`, `promotion_min_average`,
`promotion_max_failed_subjects`, `promotion_distinction_threshold`,
`promotion_core_subjects_must_pass`, `promotion_carry_over_allowed`, `promotion_automatic`,
`promotion_manual_override_allowed`). `computeClassResults()` in `results.js` (the same
function powering Broadsheet and Report Cards) gained one additive field —
`subjects[].subject_type` — with zero impact on its existing callers. New exported
`computePromotionEligibility(classId, termId)` reuses it (no re-querying marks) to compute
per-student `{average, failed_subjects, failed_core_subjects, eligible, distinction,
reasons}`; pass/fail is decided against the dedicated `promotion_pass_mark` cutoff, not by
string-matching `grade_bands.remark`. New `GET /results/promotion-eligibility` (admin-only).
`POST /students/promote` now accepts optional `from_class_id`/`term_id`; when provided *and*
`promotion_manual_override_allowed` is false, the server itself filters the request down to
the eligible set before applying it — server-enforced, not just UI-hidden, matching this
codebase's existing `marks-ownership.test.js` convention. Omitting the new fields preserves
the old behavior exactly (fully backward compatible).

`PromoteStudents.jsx` gained a term selector (was missing entirely before), fetches
eligibility once class+term are picked, shows a green "Eligible"/"Distinction" or red
reason badge per student, defaults the selection to the eligible set when
`promotion_automatic` is on or override is disallowed (otherwise keeps the historical
"select all" default), and disables checkboxes + shows an amber policy-locked banner when
override isn't allowed. `Settings.jsx` gained a `PromotionPolicyEditor` sub-editor (own
state/mutation/save button, own card below `GradeBandsEditor`) for the 8 fields.

Verified end-to-end in the browser against real seeded data: JHS 2 → Kofi Mensah showed a red
"Average 1.36 is below the required 50" badge (matches the same average seen on his report
card earlier this session); flipped the policy to `promotion_automatic=true` +
`promotion_manual_override_allowed=false` via a direct API call, reloaded, and confirmed the
amber "locked" banner appeared, the checkbox auto-unchecked, and became disabled — reset both
settings back to their defaults afterward. Added
`server/tests/promotion-eligibility.test.js` (2 tests, using its own dedicated single-subject
class fixture — deliberately controls for average by having a student's overall average
equal one clean subject score — asserting both the eligibility computation and, critically,
that the server actually blocks an ineligible student from being promoted even when their id
is included in the request body, not merely hidden client-side). 17/17 tests pass.

**All 5 phases of this feature build are now complete.** See §4's individual phase entries
above and `~/.claude/plans/lucky-tumbling-tulip.md` for the original plan.

### Multi-tenant SaaS discussion, then a scoped-down Phase 4 (public school-signup form)
After the 5-phase build, discussed turning this single-school app into a multi-tenant SaaS
product sold to other schools (still inspired by the CampusSphere videos). Agreed on a
phased roadmap without committing to it: Phase 0 (prove the tenant-column model cheaply,
throwaway spike) → Phase 1 (real `school_id`-scoped tenant isolation across every table and
route — the bulk of the actual engineering) → Phase 2 (minimal super-admin layer, just for
the user, no billing) → Phase 3 (billing) → Phase 4 (self-serve-ish onboarding). Explicit
recommendation given: start with a shared database + `school_id` column + Postgres
Row-Level-Security backstop, NOT the isolated-per-school-database architecture the
competitor's own diagram showed — that's solving a scale problem with zero paying customers,
and can be revisited per-tenant later if a real customer ever demands stronger isolation.
**None of Phases 0-3 are built.** This is architecture/planning only, captured here so a
future session doesn't have to re-derive it from scratch — re-read this section before
assuming any tenant-isolation work exists.

User asked to start with Phase 4, scoped down to what's buildable before Phases 0-3 exist:
not automated tenant provisioning (impossible without Phase 1), just a **public "interest"
signup form** — a prospective school submits basic info, it lands in a queue for the user to
manually review and follow up with.

- **Migration `008_school_signups.sql`**: new `school_signups` table
  (`school_name`, `contact_name`, `contact_email` required; `contact_phone`,
  `desired_subdomain`, `message` optional; `status` `TEXT NOT NULL DEFAULT 'new' CHECK
  (status IN ('new','contacted','declined'))` — deliberately `TEXT+CHECK` like
  `subjects.type`, not a Postgres `ENUM` like `payment_method`/`user_role`, since more status
  values will likely be added later and `ALTER TYPE ... ADD VALUE` is more painful).
- New `server/routes/signups.js`: `POST /` is the **only 6th public (no-auth) route in the
  whole app** (joining `POST /auth/login`, `/auth/otp/request`, `/auth/otp/verify`,
  `GET /settings/public`, `POST /payments/webhook`) — validated with the same manual
  inline-check convention used everywhere else in this codebase (no validation library
  exists). `GET /` and `PATCH /:id/discount`-style status update are `requireRole('admin')`.
  **No rate-limiting added** — none exists anywhere in `app.js` today, deliberately deferred
  the same way Paystack/Arkesel shipped "fully coded but unconfigured" rather than blocking
  on hardening.
- New public `client/src/pages/Signup.jsx` (self-contained, mirrors `Login.jsx`'s exact
  shell/decorative-blob markup, reuses `usePublicBranding()`/`applyBrandColor`/`applyFavicon`
  for consistent pre-login branding) plus a new "Represent a school? Request access" link
  added to `Login.jsx`'s splash screen. New admin `client/src/pages/admin/Signups.jsx`
  (list + status filter + "Mark contacted"/"Decline" row actions, follows `Teachers.jsx`'s
  conventions exactly), wired into `ADMIN_NAV` using `IconInbox` (deliberately not
  `IconClipboardList`, already `Debtors`'s icon — would've looked duplicated in the sidebar).
- **Explicit, intentional temporary hack, flagged in code comments in `signups.js`**: the
  existing `admin` role sees this new signups list, because there's no separate
  platform-owner role yet (that's Phase 2, not built). Once/if real customer schools exist,
  **their admins must not see this lead queue** — this needs to move behind an actual
  platform-owner check before this app is ever sold to anyone. Don't forget this exists.
- Verified end-to-end in the browser: submitted a real signup as a logged-out visitor
  (validation-blocked on missing fields/bad email first), confirmed the thank-you state,
  logged in as admin, confirmed the row appeared with a "new" badge, marked it "Contacted",
  confirmed the badge flipped and persisted across a reload (round-tripped through Postgres,
  not just client cache). Confirmed `GET /api/signups` returns 401 logged out and 403 as
  `teacher1` via direct curl. Added `server/tests/school-signups.test.js` (5 tests). Cleaned
  up the test signup row afterward. 22/22 tests pass.

### Login page redesign, round 2 ("boring" feedback, referencing thepatternlabs.org / Apple style)
User said the login page's first screen (the splash, before the portal picker) looked
"boring" and asked for something like thepatternlabs.org — clean, detailed, Apple-style.
Used the 21st.dev MCP tools (confirmed real and connected — the tool ID beginning
`mcp__30a48502-...` in this environment) for component-search inspiration and `WebFetch`
on thepatternlabs.org for a written design analysis (typography-first, generous whitespace,
restrained neutral palette, minimal color, calm non-distracting motion). **No "UI/UX Pro
Max" skill exists** — the user asked for it by name but nothing matching it is in this
environment's skill list; said so directly rather than pretending to use it.

Rewrote `Splash` in `client/src/pages/Login.jsx` (the `PortalPicker`/login-form stages are
untouched, still card-based — appropriate for actual forms):
- Structural change: was a small `max-w-sm` card centered in the viewport; now a true
  full-viewport landing layout — small brand-mark header (top-left, logo + school name),
  a large centered hero (much bigger type: `text-3xl` → `text-4xl`/`text-6xl`, tighter
  tracking/line-height), and a static 4-item feature grid anchored as a footer strip.
- Background: was 3 separately-animated bouncing color blobs (`animate-drift`,
  generic-SaaS-template cliché); now one single, much softer/larger radial glow. Applies
  to the portal-picker/form stages too now (they share the outer wrapper).
- Motion: the old auto-rotating single-line `FeatureTicker` (cycled one feature every
  2.8s) was deleted and replaced with a static 2×2/4-across grid of the same 4 feature
  bullets — a rotating carousel reads as "look at me," a static grid reads calmer/more
  premium, matching the "avoid distraction" motion guidance from the reference site.
  Easy to revert if the user actually preferred the rotation — it's a judgment call, not
  a bug fix.
- **Copy was deliberately NOT changed** — kept the exact existing functional copy
  ("Sign in to manage attendance, results, fees and announcements") rather than writing
  a new marketing headline. This matters: an earlier session round (see the "Login page
  redesign" entry above, iterated twice) already had the user explicitly reject generic
  SaaS marketing copy on this exact page ("School management, simplified" pill, removed).
  Don't reintroduce tagline-style copy here without the user asking for it again.
- Verified in the browser at both desktop (1440×900 — confirmed via direct
  `getBoundingClientRect()`/`scrollHeight` measurement that the layout fills exactly one
  viewport with the hero truly centered, since the Browser pane's screenshot tool has a
  fixed ~800×500 preview-pane render size decoupled from the actual configured viewport on
  wide sizes — don't be fooled by a screenshot that looks off-center at desktop width, trust
  `getBoundingClientRect()` over the screenshot pixel position when they disagree) and
  mobile (375×812, screenshot matched real proportions correctly this time — no discrepancy
  at narrow widths). Full flow (splash → portal picker → staff login form) still works, no
  console errors traceable to this change (some stale `Teachers.jsx`/`Classes.jsx` console
  errors are unrelated leftovers from earlier navigation in this same long session).

### Staff permissions, remarks module, staff directory, grouped nav (2026-07-20)
User shared screenshots of another school app (careconnect.online, green-themed "Kalakuta
Foundation") as reference and asked for: a categorized admin panel, delegated mark-entry
("we don't want all teachers entering marks — assign specific people, to reduce forgery"),
a staff directory with counts/departments, a display-only auto staff email, a remarks
module, and notifications (user chose to SKIP notifications this pass — still unbuilt).
Planned via EnterPlanMode (3 Explore agents + 1 Plan agent); plan saved at
`~/.claude/plans/fluffy-scribbling-hickey.md`. Migrations `009`-`011`. 4 commits:

- **Delegated staff permissions (migration `009_staff_permissions.sql`)**: new
  `staff_permissions` table (`permission_type` TEXT+CHECK ∈ marks_entry/remarks_entry,
  two partial unique indexes since subject_id is NULL for remarks grants). **Strictly
  additive** — a grant gives extra staff access on top of (never instead of) the
  subject teacher's `class_subjects.teacher_id` / class teacher's
  `classes.class_teacher_id` inherent rights, so `marks-ownership.test.js` passes
  unmodified. `PUT /marks/bulk` now falls through to a grant check before 403ing.
  **Also fixed in passing: `PUT /results/remarks` previously had NO ownership check at
  all** (any teacher could write any student's remark — dead capability, no client called
  it); now requires class-teacher / grant / admin via `canEditRemarksForClass()`. Added
  `GET /results/remarks` (bulk read by class+term) + `PUT /results/remarks/bulk`. New
  admin `Permissions.jsx` page (grant/revoke UI).
- **Remarks module (migration `010_remark_templates.sql`)**: `remark_templates` bank
  (type + text + optional class scope) with admin `RemarksSetup.jsx` CRUD, and shared
  `RemarkSheet.jsx` (`/admin/remarks/sheet` + `/teacher/remarks`) — pick class+term, load
  roster, per-student textarea with an "Insert template…" quick-pick, bulk save. This
  finally gives the v1 `remarks` table (always rendered on report cards) an editor.
- **Staff directory (migration `011_users_department.sql`)**: `users.department` (free
  TEXT), new `server/routes/staff.js` (`STAFF_ROLES = admin/teacher/kitchen/accountant`,
  excludes student/parent; list+filters, `/summary` counts incl. by-department, CRUD) —
  deliberately a separate route from `teachers.js`, whose `role='teacher'` contract other
  pickers rely on (that file only gained `department` additively). `StaffDirectory.jsx`
  with StatCard tiles. `GET /account/me` + department shown in the sidebar footer.
  `client/src/utils/staffEmail.js`: display-only `first.last@shortname.edu.gh` (per-part
  punctuation stripped — "Mrs." was producing a double dot until caught in the browser).
  NOT a real mailbox, purely cosmetic, user confirmed.
- **Grouped nav + Settings accordion**: new `NavGroup` + `Disclosure` components in
  `ui.jsx` (deliberately two small components, not one generic primitive). `ADMIN_NAV` is
  now a mixed array — flat entries (Dashboard, Settings) plus `{label, icon, items}`
  groups (People, Academic, Finance, Communication); `SidebarLayout.jsx` branches on
  `entry.items` and auto-expands the group containing the current route (`matchesPath`,
  evaluated only at mount). Other portals' navs stay flat and untouched. `Settings.jsx`
  sections wrapped in `<Disclosure>` (General/Branding/Academic/Finance/Communication;
  GradeBands + PromotionPolicy editors nested under Academic) — pure JSX regrouping, all
  save mutations/payloads unchanged.

Verified: 35/35 tests (`--test-concurrency=1`; 13 new across `staff-permissions`,
`remarks`, `staff-directory` test files), clean Vite build, and browser walkthrough
(grant → outsider teacher gains marks access while owner keeps theirs; template →
inserted in Remark Sheet → `PUT /remarks/bulk` 200 → persisted; nav groups + Settings
sections collapse/expand; staff creation with department updates counts). Browser test
fixtures cleaned from the dev DB afterward.

### In-app notifications (2026-07-21)
Bell icon + in-app alerts for all staff portals. Migration `012_notifications.sql` adds
a `notifications` table with a partial index for fast unread queries.

- **Auto-notify on permission grant**: `server/routes/permissions.js` now creates a
  notification ("You have been granted marks entry for JHS 2 – Mathematics") whenever
  admin grants a staff permission — the grantee sees it immediately in their bell dropdown.
- **Admin push notifications**: `POST /api/notifications` (admin-only) sends to a single
  staff member (`user_id` provided) or all active staff (omit `user_id`, bulk insert).
  New admin page `client/src/pages/admin/Notifications.jsx` under Communication group.
- **NotificationBell component** (`client/src/components/NotificationBell.jsx`): bell icon
  in the header (both `SidebarLayout` and `MobileLayout`), red unread badge (count, "9+"
  cap), dropdown panel with notification list, mark-read on click, mark-all-read button.
  Polls unread count every 30s via `useQuery` with `refetchInterval`.
- 8 new tests (`server/tests/notifications.test.js`): auto-notify on grant, admin push
  individual/all, unread-count, mark-read, mark-all-read, user isolation, non-admin rejected.
  43/43 tests pass.

### Forgot-password self-service reset (2026-07-21)
Staff can tap "Forgot password?" on the login form, enter their username, receive an OTP
via SMS to their registered phone number, and set a new password — no admin intervention
needed. Reuses the existing `otp_codes` table and Arkesel `sendSms` service.

- **Backend** (`server/routes/auth.js`): `POST /auth/forgot-password` (looks up username →
  phone, generates 6-digit OTP, sends SMS, returns masked phone like `233***001`) and
  `POST /auth/reset-password` (validates OTP, hashes new password, updates user). Both are
  public (no auth required), matching the existing OTP endpoints.
- **Frontend** (`client/src/pages/Login.jsx`): new `stage === 'forgot'` flow — username
  entry → "Send reset code" → code + new password + confirm fields → "Reset password".
  "Forgot password?" link appears below the sign-in button on both staff and family portals.
  "Back to sign in" and "Didn't get a code? Try again" links included.
- API verified via curl (both endpoints return correct responses). UI verified in browser
  (form renders correctly, full flow structure confirmed). 43/43 tests pass (no regressions).

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
5. ~~Forgot password~~ **Done** — "Forgot password?" link on the login form, OTP-based
   self-service reset via SMS to the user's registered phone number.
6. Deliberately out of scope per the PRD: transport tracking, library management,
   payroll/HR. **Multi-tenancy is no longer simply "out of scope"** — see §4's
   "Multi-tenant SaaS discussion" entry: a phased roadmap was discussed and agreed
   (architecture-only, nothing built) if the user wants to eventually sell this to other
   schools, and one small scoped-down piece of it (a public lead-capture signup form) does
   exist in code. Don't assume real tenant isolation exists anywhere — it doesn't.

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
npm test    # expect 43/43 passing (now runs with --test-concurrency=1 — see §4, don't
            # revert this to the default parallel mode, it caused intermittent 5-minute
            # hangs on this machine)

# Dev servers: use the preview_start tool with {name:"server"} and {name:"client"},
# not raw Bash — .claude/launch.json already defines both.
```

Then log in locally with the demo accounts in §3 and click around — the app is fully
functional end to end on local dev right now.
