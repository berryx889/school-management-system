# Product requirements document — school management system (SMS)

**Version:** 1.0
**Date:** July 2026
**Audience:** Claude Code (implementation agent)
**Reference:** UI walkthrough video (mobile parent/student app — purple/indigo theme, card-based dashboard, quick-action grid, attendance calendar, fee invoices, subject-wise results, notice board, teacher chat)

---

## 1. Overview

A full school management system for a Ghanaian basic school (creche through JHS). Four roles: **Admin**, **Teacher**, **Student**, **Parent**. The system handles enrollment, attendance (manual + QR check-in), grading and report cards, fees with online payment, SMS announcements to parents, a kitchen headcount report, timetables, and role-specific portals.

Design target: the attached video's app is the visual benchmark for the student/parent experience — clean cards, soft shadows, rounded corners, an indigo/violet primary color, quick-action icon grid, donut charts for attendance, and invoice-style fee screens. Admin and teacher portals are desktop-first; student and parent portals are mobile-first responsive.

### Goals
- One source of truth for students, staff, classes, subjects, attendance, marks, and fees.
- Teachers enter marks once; report cards generate automatically in the school's format.
- Parents see fees, progress, and announcements without visiting the school; they pay fees online and the ledger updates itself.
- The kitchen knows the exact headcount by mid-morning so food is not wasted.
- Results exist in two forms: printed report cards and live portal viewing, released together under admin control.

### Non-goals (v1)
- Transport/bus tracking
- Library management
- Payroll/HR
- Multi-school tenancy (build single-school, but keep a `school_settings` table so branding is configurable)

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, React Router v6, TailwindCSS, Recharts (charts), TanStack Query |
| Backend | Node.js + Express.js (REST) |
| Database | PostgreSQL on Neon (use `pg` pool with `ssl: { rejectUnauthorized: false }`) |
| Auth | JWT (access token, 24h) + bcrypt. Role claim in token. |
| Payments | Paystack (GHS; card + MTN MoMo + Telecel Cash). Webhook for confirmation. |
| SMS | Arkesel SMS API (Ghana). Sender ID = school short name. |
| QR | `qrcode` (generation, server-side) + `html5-qrcode` (scanner at the gate, runs in browser on any phone/tablet) |
| PDF/printing | Browser print with dedicated print stylesheets (`@media print`, A4). No server-side PDF in v1. |
| File storage | Student photos + logo as base64 in DB or Cloudinary free tier (pick Cloudinary if photos exceed ~200 students) |
| Hosting | Vercel (frontend), Render free tier (backend — note cold starts), Neon (DB) |

Repo layout: monorepo with `/client` and `/server`. Environment via `.env` (`DATABASE_URL`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `ARKESEL_API_KEY`).

---

## 3. Roles and permissions

| Capability | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| Manage students/teachers/classes/subjects | ✔ | — | — | — |
| Mark class attendance | ✔ | own class | — | — |
| Scan QR at gate | ✔ (or designated staff account) | ✔ | — | — |
| Enter marks | ✔ | own subjects/class | — | — |
| Release results | ✔ | — | — | — |
| View own results/timetable/attendance | — | — | ✔ | child's |
| Manage fees, record cash payments, print receipts | ✔ | — | — | — |
| Pay fees online | — | — | — | ✔ |
| Send announcements/SMS | ✔ | to own class parents (admin-approvable toggle) | — | — |
| Chat with class teacher | — | ✔ (with parents of own class) | — | ✔ |
| Kitchen headcount view | ✔ + kitchen staff account (role: `kitchen`) | — | — | — |

Login page has a role selector matching the video ("Login as…"): Admin, Teacher, Student, Parent. Students log in with student ID + password; parents with phone number + password (account auto-created when a student is enrolled with a parent phone; first-login sets password via SMS OTP).

---

## 4. Database schema (core tables)

```
school_settings(id, name, short_name, logo_url, address, phone, motto,
                current_academic_year, current_term, primary_color)

users(id, role ENUM[admin,teacher,student,parent,kitchen], username, password_hash,
      full_name, phone, email, photo_url, is_active, created_at)

classes(id, name, level, class_teacher_id → users)
subjects(id, name, code)
class_subjects(id, class_id, subject_id, teacher_id)

students(id, user_id → users, student_code UNIQUE, class_id, dob, gender,
         parent_id → users, admission_date, qr_token UNIQUE, status)

academic_terms(id, year, term, start_date, end_date, is_current)

attendance(id, student_id, date, status ENUM[present,absent,late],
           check_in_time, method ENUM[qr,manual], marked_by, UNIQUE(student_id,date))

assessments(id, class_subject_id, term_id, type ENUM[class_score,exam],
            title, max_score, weight)
marks(id, assessment_id, student_id, score, entered_by, entered_at,
      UNIQUE(assessment_id, student_id))

results_release(id, term_id, class_id, released BOOLEAN, released_at, released_by)

fee_structures(id, term_id, class_id, item_name, amount)
fee_invoices(id, student_id, term_id, total_due, generated_at)
payments(id, invoice_id, amount, method ENUM[cash,momo,card,bank],
         paystack_ref, status ENUM[pending,success,failed], recorded_by, paid_at)
-- balance = invoice total_due − SUM(successful payments)

announcements(id, title, body, audience ENUM[all,class,parents,teachers],
              class_id NULL, send_sms BOOLEAN, created_by, created_at)
sms_log(id, recipient_phone, message, status, provider_ref, sent_at)

timetable(id, class_id, day_of_week, period_no, start_time, end_time,
          subject_id, teacher_id)

messages(id, sender_id, receiver_id, student_id, body, read_at, created_at)
```

Migrations as plain SQL files in `/server/migrations`, run with a simple runner script. Seed script creates one admin, sample classes, subjects, and the current term.

---

## 5. Features

### 5.1 Authentication
- Single login page, role selector, then credentials. JWT stored in memory + refresh via localStorage token (accepted tradeoff for v1).
- Middleware: `requireAuth`, `requireRole('admin')` etc. Every route guarded.
- Password reset for parents/students via SMS OTP (Arkesel); admin can also reset any password.

### 5.2 Admin portal
**Dashboard** (matches the card style in the video, desktop layout):
- Stat cards: total students, total teachers, present today, absent today, late today, fees collected this term, fees outstanding.
- Attendance donut (today) + 30-day attendance line chart.
- Recent payments feed and recent announcements.

**Student management:** CRUD, photo upload, assign class and parent phone, bulk import from Excel (SheetJS; provide a downloadable template), promote/repeat students between years, generate/print student QR ID cards (name, photo, class, QR code — 8 per A4 page).

**Teacher management:** CRUD, assign as class teacher, assign subjects per class.

**Class & subject management:** CRUD for classes, subjects, class-subject-teacher mapping, timetable editor (grid: days × periods, dropdown per cell).

**Results control:** per class per term, a Release toggle. Until released, students/parents see "Results not yet released." Broadsheet view: class-wide table, students × subjects, totals, positions — printable A4 landscape.

**Fees module:**
- Define fee structure per class per term (itemized: tuition, feeding, PTA, etc.).
- Generate invoices for a class or the whole school in one click.
- Record cash/manual payments; print a receipt (school letterhead, receipt number, amount in words, balance remaining).
- Debtors list filterable by class; bulk-print reminder slips; one-click SMS fee reminder to selected debtors ("Dear parent, {student} owes GHS {balance} for {term}. Please settle at the office or pay online at {link}.").

**Announcements:** compose, choose audience, optional SMS. SMS goes to parent phone numbers of the audience. Log every SMS in `sms_log` with delivery status.

**Kitchen report:** page (also visible to `kitchen` role) showing today's present count, broken down by class, updating as attendance comes in. One number, big type, top of page: "Cook for N students." Include a 7-day history table.

### 5.3 Teacher portal
- **Morning attendance:** class list with tap-to-toggle Present/Absent/Late. Defaults every student to present; teacher untoggles absentees. Submit once; edits allowed until 10:00 (configurable), after that admin only.
- **Marks entry:** pick class-subject → term → assessment. Spreadsheet-like grid (student rows, score input), keyboard navigation, autosave per cell, validation against max_score. Once admin locks a term's marks, inputs become read-only.
- **My timetable** view.
- **Parent chat:** thread per student in the teacher's class. Simple polling (10s) — no websockets in v1.
- Teacher can draft a class announcement; if the admin-approval toggle is on in settings, it queues for admin approval before SMS goes out.

### 5.4 QR gate check-in
- A "Gate scanner" page (admin/teacher role) using the device camera via `html5-qrcode`.
- Scanning a student's QR: records `attendance` row with `check_in_time`, method `qr`, status `present` or `late` if after the configurable late threshold (default 07:45).
- Instant on-screen confirmation: photo, name, class, time, green/amber flash. Duplicate scans on the same day are ignored with a "already checked in" toast.
- Manual teacher attendance and QR co-exist: QR writes first; teacher marking never overwrites a QR `present` into `absent` (it can add `absent` only where no QR record exists).

### 5.5 Grading and report cards (Ghanaian convention)
- Term result per subject = class score (out of configurable weight, default 50) + exam score (default 50) → total 100.
- Grade bands (configurable in settings, seeded with a standard GES-style scale): 80–100 = 1 (Excellent), 70–79 = 2 (Very good), 60–69 = 3 (Good), 55–59 = 4 (Credit), 50–54 = 5 (Pass), 0–49 = 6 (Fail) — adjust per school preference in settings.
- Report card (print stylesheet, A4 portrait, one page per student, supports batch printing a whole class in one print job with page breaks):
  - School letterhead (logo, name, address, motto)
  - Student details, photo, class, term, attendance summary (days present / total)
  - Subject table: class score, exam score, total, grade, position in subject, remark
  - Overall total, average, class position, class teacher's remark, head teacher's remark, next term begins date
- Remarks: teacher enters class-teacher remark per student; head remark auto-suggested from average, editable.

### 5.6 Student portal (mobile-first, mirrors the video)
- Dashboard: greeting card with photo and class, quick-action grid (Attendance, Results, Timetable, Fees, Notices), today's timetable strip.
- Attendance: monthly calendar with color-coded days + donut summary (present/absent/late %), like the video.
- Results: term selector; once released, subject-wise table with scores, grades, position, and a downloadable/printable view identical to the paper report card.
- Timetable: day tabs, period list with subject and teacher.
- Notices: card list, newest first.

### 5.7 Parent portal (mobile-first)
- If multiple children, a child switcher at the top.
- Everything in the student portal, plus:
- **Fees:** current invoice with itemized breakdown, balance, payment history, and a **Pay now** button → Paystack checkout (card/MoMo). On webhook success, payment recorded, balance updates, receipt viewable, confirmation SMS sent.
- **Chat with class teacher:** the thread described in 5.3, framed around the child's progress. Teachers can flag weak subjects; the flag shows as a highlighted note in the parent's view of results.
- **Progress:** per-subject trend across terms (line chart) so weak subjects are visible at a glance.

### 5.8 Payments (Paystack)
- Server initializes transaction (`/api/payments/initiate`) with amount in pesewas, metadata `{invoice_id, student_id}`.
- Client opens Paystack popup.
- Webhook `/api/payments/webhook` verifies signature, marks payment `success`, inserts row, fires SMS receipt. Idempotent by `paystack_ref`.
- Manual verification fallback: `/api/payments/verify/:reference` called on client redirect, same idempotency.

### 5.9 SMS (Arkesel)
- Single `sendSms(to, message)` service with logging and retry (1 retry).
- Triggers: announcements (opt-in per announcement), fee reminders (manual bulk action), payment confirmations (automatic), OTP.
- All numbers normalized to `233XXXXXXXXX`.

---

## 6. API surface (prefix `/api`)

```
POST   /auth/login            /auth/otp/request   /auth/otp/verify
GET    /dashboard/admin       /dashboard/kitchen

CRUD   /students  /teachers  /classes  /subjects  /class-subjects  /timetable
POST   /students/import       (Excel)
GET    /students/:id/qr-card

POST   /attendance/manual     { class_id, date, records[] }
POST   /attendance/scan       { qr_token }
GET    /attendance?class_id&date | ?student_id&month

CRUD   /assessments
PUT    /marks/bulk            { assessment_id, entries[] }
GET    /results/broadsheet?class_id&term_id
GET    /results/student/:id?term_id
POST   /results/release       { class_id, term_id, released }

CRUD   /fees/structures
POST   /fees/invoices/generate
GET    /fees/invoices?student_id | /fees/debtors?class_id
POST   /payments/manual       /payments/initiate    /payments/webhook
GET    /payments/verify/:reference
GET    /receipts/:payment_id

CRUD   /announcements         POST /announcements/:id/send-sms
GET    /messages?student_id   POST /messages

GET/PUT /settings
```

All list endpoints support pagination (`page`, `limit`) and search where sensible. Consistent error shape: `{ error: string }` with correct status codes.

---

## 7. UI spec

- **Theme:** indigo/violet primary (`#5B4FE9` range), white cards on `#F5F6FA` background, 16px card radius, subtle shadows — copy the look of the reference video.
- **Student/parent portals:** bottom tab bar on mobile (Home, Attendance, Results, Fees, More). Quick-action grid with rounded icon tiles as in the video.
- **Admin/teacher:** left sidebar layout, collapsible on tablet.
- Accessibility: labeled inputs, focus states, ≥4.5:1 contrast, all interactive elements reachable by keyboard. `aria-live` toasts for scan confirmations.
- Print stylesheets isolated per document type (report card, broadsheet, receipt, QR ID cards). Hide app chrome in print. Test multi-page batch printing early — page breaks between students are a known pain point.

---

## 8. Build order

1. **Foundation:** repo scaffold, DB migrations, seed, auth, role middleware, settings.
2. **People:** students/teachers/classes/subjects CRUD, Excel import, class-subject mapping, timetable.
3. **Attendance:** manual marking, QR generation + ID cards, gate scanner, kitchen report, admin dashboard stats.
4. **Grading:** assessments, marks entry grid, grade computation, report card print, broadsheet, release control, student/parent results views.
5. **Fees:** structures, invoices, manual payments + receipts, debtors list, Paystack flow, webhook.
6. **Comms:** announcements, Arkesel SMS, fee reminder SMS, parent-teacher chat, OTP login for parents.
7. **Polish:** parent progress charts, batch printing hardening, accessibility pass, empty states, deploy (Render + Vercel + Neon), smoke tests.

Each phase must end with the app deployable and demonstrable. Write a `HANDOFF.md` at the end of every session summarizing state, so work can resume across sessions.

## 9. Acceptance criteria (spot checks)

- Scanning a QR at 07:50 with a 07:45 threshold records `late` and shows amber confirmation.
- Marking attendance twice for the same student/date does not create duplicates.
- A parent paying GHS 200 via MoMo sees the balance drop without a page refresh beyond the redirect, receives an SMS, and the receipt prints with the correct receipt number.
- Printing JHS 2's report cards produces one page per student with no orphaned rows.
- A student cannot see results for an unreleased term; the moment admin releases, they can.
- The kitchen page shows the same present-count as the admin dashboard at all times.
- No teacher can enter marks for a class-subject not assigned to them (verified server-side, not just hidden in UI).
