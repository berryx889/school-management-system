# Handoff — Bright Future Basic School SMS

**Status:** All 7 phases from `SMS-PRD.md` are built and verified working end-to-end
against a local Postgres database with seeded demo data. See `README.md` for how to
run it.

## What's built

Every feature in the PRD §5 is implemented: auth + role-based routing, student/teacher/
class/subject CRUD with Excel import, QR-based + manual attendance with the "QR never
downgraded by manual" rule, kitchen headcount, marks entry with server-side
teacher-ownership enforcement, grade computation from configurable bands, printable
report cards (batch, one page per student) and broadsheet, results release gating, fee
structures/invoices/manual payments/receipts/debtors + SMS reminders, the full Paystack
initiate/webhook/verify flow, Arkesel-backed announcements and OTP, parent-teacher chat,
and parent per-subject progress charts.

## Verified against PRD §9 acceptance criteria

- QR scan after the late threshold records `late` (confirmed via a live test with a
  temporarily lowered threshold).
- Marking attendance twice for the same student/date does not duplicate
  (`UNIQUE(student_id, date)` + upsert).
- Recording a payment drops the invoice balance immediately and produces a numbered,
  printable receipt with amount-in-words.
- A student cannot see results for an unreleased term; toggling release in
  Results Release makes them visible immediately.
- Kitchen headcount and admin dashboard "present today" stay in sync (same underlying
  query logic).
- A teacher's `PUT /marks/bulk` for a class-subject they aren't assigned to is rejected
  with 403 **server-side**, verified with a second teacher account via raw API call
  (not just hidden in the UI).
- Report card batch print renders one full A4-style page per student with a page-break
  hook in the print stylesheet (`print:break-after-page` on `.report-card`).

## Known gaps / before production

1. **Paystack & Arkesel keys are blank.** Both integrations are fully coded
   (`server/services/paystack.js`, `server/services/sms.js`) and read from `.env`.
   Without keys, payments show "not configured" to parents and SMS sends are logged to
   `sms_log` with status `not_configured` instead of delivering. Add
   `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` / `ARKESEL_API_KEY` to go live.
2. **`xlsx` (SheetJS) has a known unpatched high-severity advisory on the npm registry**
   (prototype pollution / ReDoS in older published versions — the fixed line only ships
   via SheetJS's own CDN, not npm). Used only for the admin-only student Excel import.
   Low risk today since only authenticated admins can hit that endpoint, but swap to the
   CDN-distributed fixed build before treating uploaded spreadsheets as fully untrusted.
3. **Student/logo photos store as base64 in Postgres** (v1 scope per PRD). Swap for
   Cloudinary if the school exceeds ~200 students with photos, per PRD §2.
4. **Local Postgres runs on port 5433** (a separate Homebrew instance), not 5432,
   specifically to avoid Postgres.app's macOS GUI permission dialog blocking headless
   connections. See `README.md` for the exact start command. Swap `DATABASE_URL` for a
   Neon connection string in production — no code changes needed either way.
5. **No automated test suite.** All verification in this session was manual (through the
   UI and direct API calls). Worth adding at least request-level tests for the
   attendance-precedence and marks-ownership rules, since those are the two rules with
   real correctness/security consequences if regressed silently.

## Dev quick reference

- `.claude/launch.json` defines both dev servers (`server` on :4000, `client` on :5174 —
  Vite falls back off 5173 if something else already holds it).
- Demo logins are in `README.md`.
- `server/migrations/run.js` is idempotent — safe to re-run.
