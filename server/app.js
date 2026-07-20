import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import settingsRoutes from './routes/settings.js';
import termRoutes from './routes/terms.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import classRoutes from './routes/classes.js';
import subjectRoutes from './routes/subjects.js';
import classSubjectRoutes from './routes/classSubjects.js';
import timetableRoutes from './routes/timetable.js';
import attendanceRoutes from './routes/attendance.js';
import dashboardRoutes from './routes/dashboard.js';
import assessmentRoutes from './routes/assessments.js';
import marksRoutes from './routes/marks.js';
import resultsRoutes from './routes/results.js';
import feeRoutes from './routes/fees.js';
import paymentRoutes from './routes/payments.js';
import receiptRoutes from './routes/receipts.js';
import announcementRoutes from './routes/announcements.js';
import messageRoutes from './routes/messages.js';
import signupRoutes from './routes/signups.js';
import permissionRoutes from './routes/permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Paystack webhook needs the raw body for signature verification, so mount it before json parsing.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/class-subjects', classSubjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/signups', signupRoutes);
app.use('/api/permissions', permissionRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});
