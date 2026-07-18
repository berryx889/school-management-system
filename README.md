# Bright Future Basic School — School Management System

Full-stack school management system per `SMS-PRD.md`: admin, teacher, student and parent
portals covering enrollment, attendance (manual + QR), grading/report cards, fees with
online payment, SMS announcements, timetables, and a kitchen headcount report.

## Stack

- `/client` — React 18 + Vite + React Router v6 + TailwindCSS v4 + TanStack Query + Recharts
- `/server` — Node.js + Express, plain-SQL migrations, JWT auth
- PostgreSQL (local for dev; swap `DATABASE_URL` for Neon in production)

## Quick start

### 1. Database

Requires a local PostgreSQL server. If you don't have one running:

```bash
brew install postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
export LC_ALL="en_US.UTF-8"   # works around a known macOS "multithreaded during startup" crash
pg_ctl -D /opt/homebrew/var/postgresql@16 -o "-p 5433" -l /tmp/pg16.log start
createdb -p 5433 -h /tmp sms_dev
```

> If you already run **Postgres.app**, don't use its port — it shows a GUI permission
> dialog on the first connection from a new app, which blocks headless/background
> processes. This project defaults to a separate Homebrew instance on port 5433 instead.

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` — set `DATABASE_URL` to your Postgres user, e.g.:

```
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@/sms_dev?host=/tmp&port=5433
```

Leave `PAYSTACK_SECRET_KEY` / `ARKESEL_API_KEY` blank for local dev — payments and SMS
fall back to safe no-ops (payments show "not configured"; SMS sends are logged to the
`sms_log` table instead of actually sending).

### 3. Server

```bash
cd server
npm install
npm run migrate   # applies /server/migrations/*.sql, idempotent
npm run seed       # creates demo accounts (see below)
npm run dev         # http://localhost:4000
```

### 4. Client

```bash
cd client
npm install
npm run dev   # http://localhost:5173 (proxies /api to :4000)
```

## Demo accounts (after `npm run seed`)

| Role    | Username        | Password    |
|---------|-----------------|-------------|
| Admin   | `admin`         | `admin123`  |
| Teacher | `teacher1`      | `teacher123`|
| Student | `STU0001`       | `student123`|
| Parent  | `233200000099`  | `parent123` |
| Kitchen | `kitchen`       | `kitchen123`|

## Repo layout

```
/server/migrations   plain SQL, applied in order by migrations/run.js
/server/routes        one file per resource, mirrors the PRD §6 API surface
/server/services       sms.js (Arkesel), paystack.js — both no-op safely without keys
/client/src/pages/admin    desktop sidebar portal
/client/src/pages/teacher  desktop sidebar portal
/client/src/pages/student  mobile bottom-tab portal
/client/src/pages/parent   mobile bottom-tab portal + child switcher
/client/src/pages/shared   components reused across roles (marks entry, results, chat, timetable...)
```

See `HANDOFF.md` for current status and what's needed before production use.
