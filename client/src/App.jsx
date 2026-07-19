import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ParentProvider } from './auth/ParentContext.jsx';
import SidebarLayout from './layouts/SidebarLayout.jsx';
import MobileLayout from './layouts/MobileLayout.jsx';
import {
  IconHome, IconGraduationCap, IconUser, IconBuilding, IconBook, IconLink, IconCalendar,
  IconCamera, IconUtensils, IconEdit, IconBarChart, IconFileText, IconUnlock, IconWallet,
  IconClipboardList, IconMegaphone, IconSettings, IconCreditCard, IconMessageCircle,
} from './components/Icon.jsx';

import Login from './pages/Login.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import Students from './pages/admin/Students.jsx';
import StudentQrCard from './pages/admin/StudentQrCard.jsx';
import Teachers from './pages/admin/Teachers.jsx';
import Classes from './pages/admin/Classes.jsx';
import Subjects from './pages/admin/Subjects.jsx';
import ClassSubjects from './pages/admin/ClassSubjects.jsx';
import AdminTimetable from './pages/admin/Timetable.jsx';
import ResultsRelease from './pages/admin/ResultsRelease.jsx';
import FeeStructures from './pages/admin/FeeStructures.jsx';
import Debtors from './pages/admin/Debtors.jsx';
import AdminSettings from './pages/admin/Settings.jsx';

import TeacherDashboard from './pages/teacher/Dashboard.jsx';
import AttendanceMark from './pages/teacher/AttendanceMark.jsx';
import TeacherTimetable from './pages/teacher/Timetable.jsx';
import TeacherChat from './pages/teacher/ChatPage.jsx';

import StudentDashboard from './pages/student/Dashboard.jsx';
import StudentAttendance from './pages/student/Attendance.jsx';
import StudentResults from './pages/student/Results.jsx';
import StudentTimetable from './pages/student/Timetable.jsx';
import StudentNotices from './pages/student/Notices.jsx';

import ParentDashboard from './pages/parent/Dashboard.jsx';
import ParentAttendance from './pages/parent/Attendance.jsx';
import ParentResults from './pages/parent/Results.jsx';
import ParentTimetable from './pages/parent/Timetable.jsx';
import ParentNotices from './pages/parent/Notices.jsx';
import ParentFees from './pages/parent/Fees.jsx';
import ParentChat from './pages/parent/ChatPage.jsx';
import ParentProgress from './pages/parent/Progress.jsx';

import GateScanner from './pages/shared/GateScanner.jsx';
import Kitchen from './pages/shared/Kitchen.jsx';
import MarksEntry from './pages/shared/MarksEntry.jsx';
import Broadsheet from './pages/shared/Broadsheet.jsx';
import ReportCards from './pages/shared/ReportCards.jsx';
import Announcements from './pages/shared/Announcements.jsx';
import Receipt from './pages/shared/Receipt.jsx';

const ADMIN_NAV = [
  { to: '/admin', end: true, icon: IconHome, label: 'Dashboard' },
  { to: '/admin/students', icon: IconGraduationCap, label: 'Students' },
  { to: '/admin/teachers', icon: IconUser, label: 'Teachers' },
  { to: '/admin/classes', icon: IconBuilding, label: 'Classes' },
  { to: '/admin/subjects', icon: IconBook, label: 'Subjects' },
  { to: '/admin/class-subjects', icon: IconLink, label: 'Subject teachers' },
  { to: '/admin/timetable', icon: IconCalendar, label: 'Timetable' },
  { to: '/admin/attendance/scanner', icon: IconCamera, label: 'Gate scanner' },
  { to: '/admin/kitchen', icon: IconUtensils, label: 'Kitchen report' },
  { to: '/admin/grading/marks', icon: IconEdit, label: 'Marks entry' },
  { to: '/admin/grading/broadsheet', icon: IconBarChart, label: 'Broadsheet' },
  { to: '/admin/grading/report-cards', icon: IconFileText, label: 'Report cards' },
  { to: '/admin/grading/release', icon: IconUnlock, label: 'Results release' },
  { to: '/admin/fees/structures', icon: IconWallet, label: 'Fee structures' },
  { to: '/admin/fees/debtors', icon: IconClipboardList, label: 'Debtors' },
  { to: '/admin/announcements', icon: IconMegaphone, label: 'Announcements' },
  { to: '/admin/settings', icon: IconSettings, label: 'Settings' },
];

const TEACHER_NAV = [
  { to: '/teacher', end: true, icon: IconHome, label: 'Dashboard' },
  { to: '/teacher/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/teacher/marks', icon: IconEdit, label: 'Marks entry' },
  { to: '/teacher/timetable', icon: IconCalendar, label: 'My timetable' },
  { to: '/teacher/chat', icon: IconMessageCircle, label: 'Parent chat' },
  { to: '/teacher/announcements', icon: IconMegaphone, label: 'Announcements' },
];

const KITCHEN_NAV = [{ to: '/kitchen', end: true, icon: IconUtensils, label: 'Headcount' }];

const STUDENT_TABS = [
  { to: '/student', end: true, icon: IconHome, label: 'Home' },
  { to: '/student/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/student/results', icon: IconBarChart, label: 'Results' },
  { to: '/student/timetable', icon: IconCalendar, label: 'Timetable' },
  { to: '/student/notices', icon: IconMegaphone, label: 'More' },
];

const PARENT_TABS = [
  { to: '/parent', end: true, icon: IconHome, label: 'Home' },
  { to: '/parent/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/parent/results', icon: IconBarChart, label: 'Results' },
  { to: '/parent/fees', icon: IconCreditCard, label: 'Fees' },
  { to: '/parent/notices', icon: IconMegaphone, label: 'More' },
];

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><SidebarLayout nav={ADMIN_NAV} /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id/qr-card" element={<StudentQrCard />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="classes" element={<Classes />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="class-subjects" element={<ClassSubjects />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="attendance/scanner" element={<GateScanner />} />
        <Route path="kitchen" element={<Kitchen />} />
        <Route path="grading/marks" element={<MarksEntry />} />
        <Route path="grading/broadsheet" element={<Broadsheet />} />
        <Route path="grading/report-cards" element={<ReportCards />} />
        <Route path="grading/release" element={<ResultsRelease />} />
        <Route path="fees/structures" element={<FeeStructures />} />
        <Route path="fees/debtors" element={<Debtors />} />
        <Route path="receipts/:paymentId" element={<Receipt />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><SidebarLayout nav={TEACHER_NAV} /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<AttendanceMark />} />
        <Route path="marks" element={<MarksEntry />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="chat" element={<TeacherChat />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>

      <Route path="/kitchen" element={<ProtectedRoute roles={['admin', 'kitchen']}><SidebarLayout nav={KITCHEN_NAV} /></ProtectedRoute>}>
        <Route index element={<Kitchen />} />
      </Route>

      <Route path="/student" element={<ProtectedRoute roles={['student']}><MobileLayout tabs={STUDENT_TABS} /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="notices" element={<StudentNotices />} />
      </Route>

      <Route
        path="/parent"
        element={
          <ProtectedRoute roles={['parent']}>
            <ParentProvider>
              <MobileLayout tabs={PARENT_TABS} />
            </ParentProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="results" element={<ParentResults />} />
        <Route path="fees" element={<ParentFees />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="notices" element={<ParentNotices />} />
        <Route path="chat" element={<ParentChat />} />
        <Route path="progress" element={<ParentProgress />} />
        <Route path="receipts/:paymentId" element={<Receipt />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
