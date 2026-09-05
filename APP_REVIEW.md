# Whole-application review

Reviewed: 5 September 2026

## Current coverage

The application now covers the core school workflow: role-based staff and family portals, student and staff records, academic structure, timetable, QR/manual attendance, assessments and marks, report cards and remarks, promotion, fees/invoices/payments/receipts/debtors, expenses, announcements, messaging, notifications, house points, audit logs, 2FA, multi-school data scoping, and a Super Admin command centre.

## Corrections made in this review

- Restricted raw marks, assessments, class insights, attendance histories, results, receipts, and billing records to the correct roles and student/class relationships.
- Prevented teachers from marking attendance for unrelated classes or including students outside the selected class.
- Added date, attendance-status, pagination, fee, assessment, and upload-size validation.
- Made manual payment recording transactional so simultaneous payments cannot overpay an invoice.
- Made online payment initiation reject invalid amounts and amounts above the current balance.
- Reconciled Paystack success events against the server-created pending transaction instead of trusting callback metadata; online receipts now receive receipt numbers.
- Prevented an ordinary admin from resetting a Super Admin password.
- Made OTP generation cryptographically secure and OTP consumption atomic.
- Serialized student-number allocation to avoid duplicate codes during simultaneous admissions.
- Added database checks for positive payments and assessment values, non-negative fees/invoices/discounts, plus a payment lookup index.
- Removed concurrent queries on a single tenant-bound PostgreSQL client, eliminating a `pg` deprecation/race warning.
- Updated vulnerable dependency chains; both package audits report zero known vulnerabilities.
- Removed dead frontend code and corrected error-boundary reset behaviour.

## Recommended functionality roadmap

### Priority 1 — operational reliability

1. **Payment reconciliation workspace** — show pending/failed/successful Paystack transactions, unmatched webhook events, retry status checks, and an admin correction trail. This directly addresses “payment made but balance did not reflect” support cases.
2. **Database backup and restore drills** — automated Neon backups, a documented restore test, and an admin-visible last-backup indicator.
3. **Integration health page** — verify Paystack, SMS, email, database, and deployment health without exposing secrets.
4. **Data-quality centre** — identify students without parents/classes/houses, duplicate phone numbers, incomplete marks, timetable gaps, and invoices needing attention.

### Priority 2 — reduce staff workload

1. **Bulk operations with preview and undo** — student class/house assignment, invoice adjustments, attendance corrections, and result publication.
2. **Timetable conflict detection** — block double-booked teachers, rooms, and classes; add printable teacher/class timetables.
3. **Attendance exceptions workflow** — late/absence reasons, approval, parent acknowledgement, and daily exception follow-up.
4. **Report-card completion tracker** — show missing assessments, marks, and remarks before results can be released.
5. **Parent onboarding and account recovery** — invitation status, verified phone changes, guardian linking, and support-assisted recovery.

### Priority 3 — broaden the product

1. **Library and textbook tracking** — issue/return, overdue reminders, lost-item charges, and class textbook allocation.
2. **Inventory and procurement** — stock, suppliers, purchase approvals, low-stock alerts, and expense linkage.
3. **Staff leave, payroll, and appraisal** — attendance/leave records, payroll exports, and performance reviews.
4. **Student wellbeing and incidents** — nurse visits, safeguarding notes, behaviour incidents, interventions, and tightly scoped access.
5. **Analytics exports** — configurable PDF/Excel packs for attendance, finance, assessment trends, houses, and statutory reporting.

## Deployment requirement

Production should define both `DATABASE_URL` (owner/migrations) and `DATABASE_APP_URL` (restricted runtime role). The runtime role must not own tables and must not have `SUPERUSER` or `BYPASSRLS`; otherwise PostgreSQL row-level tenant isolation can be bypassed. The Render blueprint now documents this required variable.

## Verification

- Server: 74 tests passing after this review.
- Client: production build passing.
- Client/server dependency audits: zero known vulnerabilities.
- Remaining lint notices are limited to React Fast Refresh file-organization advice and do not affect production behaviour.
