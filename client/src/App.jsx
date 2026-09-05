import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { dashboardPath } from './auth/roleRoutes.js';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ParentProvider } from './auth/ParentContext.jsx';
import SidebarLayout from './layouts/SidebarLayout.jsx';
import MobileLayout from './layouts/MobileLayout.jsx';
import { PageLoader } from './components/ui.jsx';
import NotFound from './pages/NotFound.jsx';
import {
  IconHome, IconGraduationCap, IconUser, IconUsers, IconBuilding, IconBook, IconLink, IconCalendar,
  IconCamera, IconUtensils, IconEdit, IconBarChart, IconFileText, IconUnlock, IconWallet,
  IconClipboardList, IconMegaphone, IconSettings, IconCreditCard, IconMessageCircle, IconTrendingUp,
  IconShield, IconBell, IconActivity, IconTrash,
} from './components/Icon.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Students = lazy(() => import('./pages/admin/Students.jsx'));
const PromoteStudents = lazy(() => import('./pages/admin/PromoteStudents.jsx'));
const StudentQrCard = lazy(() => import('./pages/admin/StudentQrCard.jsx'));
const Teachers = lazy(() => import('./pages/admin/Teachers.jsx'));
const StaffDirectory = lazy(() => import('./pages/admin/StaffDirectory.jsx'));
const Permissions = lazy(() => import('./pages/admin/Permissions.jsx'));
const Classes = lazy(() => import('./pages/admin/Classes.jsx'));
const ClassDetail = lazy(() => import('./pages/admin/ClassDetail.jsx'));
const StructureBuilder = lazy(() => import('./pages/admin/StructureBuilder.jsx'));
const Subjects = lazy(() => import('./pages/admin/Subjects.jsx'));
const ClassSubjects = lazy(() => import('./pages/admin/ClassSubjects.jsx'));
const AdminTimetable = lazy(() => import('./pages/admin/Timetable.jsx'));
const AcademicTerms = lazy(() => import('./pages/admin/AcademicTerms.jsx'));
const ResultsRelease = lazy(() => import('./pages/admin/ResultsRelease.jsx'));
const RemarksSetup = lazy(() => import('./pages/admin/RemarksSetup.jsx'));
const FeeStructures = lazy(() => import('./pages/admin/FeeStructures.jsx'));
const Debtors = lazy(() => import('./pages/admin/Debtors.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));
const Expenses = lazy(() => import('./pages/admin/Expenses.jsx'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog.jsx'));
const Trash = lazy(() => import('./pages/admin/Trash.jsx'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications.jsx'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard.jsx'));

const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard.jsx'));
const AttendanceMark = lazy(() => import('./pages/teacher/AttendanceMark.jsx'));
const TeacherTimetable = lazy(() => import('./pages/teacher/Timetable.jsx'));
const TeacherChat = lazy(() => import('./pages/teacher/ChatPage.jsx'));

const StudentDashboard = lazy(() => import('./pages/student/Dashboard.jsx'));
const StudentAttendance = lazy(() => import('./pages/student/Attendance.jsx'));
const StudentResults = lazy(() => import('./pages/student/Results.jsx'));
const StudentTimetable = lazy(() => import('./pages/student/Timetable.jsx'));
const StudentNotices = lazy(() => import('./pages/student/Notices.jsx'));

const ParentDashboard = lazy(() => import('./pages/parent/Dashboard.jsx'));
const ParentAttendance = lazy(() => import('./pages/parent/Attendance.jsx'));
const ParentResults = lazy(() => import('./pages/parent/Results.jsx'));
const ParentTimetable = lazy(() => import('./pages/parent/Timetable.jsx'));
const ParentNotices = lazy(() => import('./pages/parent/Notices.jsx'));
const ParentFees = lazy(() => import('./pages/parent/Fees.jsx'));
const ParentChat = lazy(() => import('./pages/parent/ChatPage.jsx'));
const ParentProgress = lazy(() => import('./pages/parent/Progress.jsx'));

const GateScanner = lazy(() => import('./pages/shared/GateScanner.jsx'));
const Kitchen = lazy(() => import('./pages/shared/Kitchen.jsx'));
const MarksEntry = lazy(() => import('./pages/shared/MarksEntry.jsx'));
const Broadsheet = lazy(() => import('./pages/shared/Broadsheet.jsx'));
const ReportCards = lazy(() => import('./pages/shared/ReportCards.jsx'));
const Announcements = lazy(() => import('./pages/shared/Announcements.jsx'));
const Receipt = lazy(() => import('./pages/shared/Receipt.jsx'));
const RemarkSheet = lazy(() => import('./pages/shared/RemarkSheet.jsx'));
const HouseSystem = lazy(() => import('./pages/shared/HouseSystem.jsx'));

const ADMIN_NAV = [
  { to: '/admin', end: true, icon: IconHome, label: 'Dashboard' },
  { label: 'People', icon: IconUsers, items: [
    { to: '/admin/students', icon: IconGraduationCap, label: 'Students' },
    { to: '/admin/students/promote', icon: IconTrendingUp, label: 'Promote students' },
    { to: '/admin/teachers', icon: IconUser, label: 'Teachers' },
    { to: '/admin/staff', icon: IconUsers, label: 'Staff directory' },
    { to: '/admin/permissions', icon: IconShield, label: 'Permissions' },
    { to: '/admin/classes', icon: IconBuilding, label: 'Classes' },
    { to: '/admin/houses', icon: IconActivity, label: 'House system' },
    { to: '/admin/subjects', icon: IconBook, label: 'Subjects' },
    { to: '/admin/class-subjects', icon: IconLink, label: 'Subject teachers' },
  ] },
  { label: 'Academic', icon: IconBarChart, items: [
    { to: '/admin/academic-terms', icon: IconCalendar, label: 'Academic terms' },
    { to: '/admin/timetable', icon: IconCalendar, label: 'Timetable' },
    { to: '/admin/grading/marks', icon: IconEdit, label: 'Marks entry' },
    { to: '/admin/grading/broadsheet', icon: IconBarChart, label: 'Broadsheet' },
    { to: '/admin/grading/report-cards', icon: IconFileText, label: 'Report cards' },
    { to: '/admin/grading/release', icon: IconUnlock, label: 'Results release' },
    { to: '/admin/remarks/sheet', icon: IconEdit, label: 'Remark sheet' },
    { to: '/admin/remarks/setup', icon: IconFileText, label: 'Remarks setup' },
    { to: '/admin/attendance/scanner', icon: IconCamera, label: 'Gate scanner' },
    { to: '/admin/kitchen', icon: IconUtensils, label: 'Kitchen report' },
  ] },
  { label: 'Finance', icon: IconWallet, items: [
    { to: '/admin/fees/structures', icon: IconWallet, label: 'Fee structures' },
    { to: '/admin/fees/debtors', icon: IconClipboardList, label: 'Debtors' },
    { to: '/admin/expenses', icon: IconWallet, label: 'Expenses' },
  ] },
  { label: 'Communication', icon: IconMegaphone, items: [
    { to: '/admin/announcements', icon: IconMegaphone, label: 'Announcements' },
    { to: '/admin/notifications', icon: IconBell, label: 'Push notifications' },
  ] },
  { to: '/admin/audit', icon: IconActivity, label: 'Audit log' },
  { to: '/admin/trash', icon: IconTrash, label: 'Trash' },
  { to: '/admin/settings', icon: IconSettings, label: 'Settings' },
];
const SUPER_ADMIN_NAV = [
  { ...ADMIN_NAV[0], to: '/super-admin', label: 'Command center', icon: IconShield },
  ...ADMIN_NAV.slice(1),
];

const TEACHER_NAV = [
  { to: '/teacher', end: true, icon: IconHome, label: 'Dashboard' },
  { to: '/teacher/gate-scanner', icon: IconCamera, label: 'Gate scanner' },
  { to: '/teacher/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/teacher/marks', icon: IconEdit, label: 'Marks entry' },
  { to: '/teacher/remarks', icon: IconFileText, label: 'Remarks' },
  { to: '/teacher/houses', icon: IconActivity, label: 'House points' },
  { to: '/teacher/timetable', icon: IconCalendar, label: 'My timetable' },
  { to: '/teacher/chat', icon: IconMessageCircle, label: 'Parent chat' },
  { to: '/teacher/announcements', icon: IconMegaphone, label: 'Announcements' },
];

const KITCHEN_NAV = [{ to: '/kitchen', end: true, icon: IconUtensils, label: 'Headcount' }];

const ACCOUNTANT_NAV = [
  { to: '/accountant', end: true, icon: IconClipboardList, label: 'Debtors' },
  { to: '/accountant/structures', icon: IconWallet, label: 'Fee structures' },
  { to: '/accountant/expenses', icon: IconWallet, label: 'Expenses' },
];

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

const PAGE_NAMES = {
  admin: 'Admin dashboard', accountant: 'Finance dashboard', audit: 'Audit history', attendance: 'Attendance', announcements: 'Announcements',
  broadsheet: 'Broadsheet', chat: 'Messages', classes: 'Classes', debtors: 'Fees and debtors',
  expenses: 'Expenses', fees: 'Fees', houses: 'House system', kitchen: 'Kitchen headcount',
  login: 'Sign in', marks: 'Marks entry', notices: 'Notices', notifications: 'Notifications',
  parent: 'Parent dashboard', permissions: 'Staff permissions', progress: 'Learning progress', receipts: 'Payment receipt', 'report-cards': 'Report cards',
  remarks: 'Report remarks', results: 'Results', settings: 'Settings', staff: 'Staff directory',
  student: 'Student dashboard', students: 'Students', subjects: 'Subjects', teacher: 'Teacher dashboard', teachers: 'Teachers', timetable: 'Timetable',
  trash: 'Trash', structures: 'Fee structures', 'super-admin': 'Super Admin command center',
};

function RoutePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const update = () => {
      const parts = pathname.split('/').filter(Boolean);
      const pageName = [...parts].reverse().map((part) => PAGE_NAMES[part]).find(Boolean);
      const schoolName = document.documentElement.dataset.schoolName || 'OUR WORLD MODEL SCHOOL';
      document.title = pageName ? `${pageName} | ${schoolName}` : schoolName;
    };
    update();
    window.addEventListener('school-brand-change', update);
    return () => window.removeEventListener('school-brand-change', update);
  }, [pathname]);
  return null;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  return <Navigate to={dashboardPath(user.role)} replace />;
}

function AdminLayout() {
  const { user } = useAuth();
  return <SidebarLayout nav={user?.role === 'super_admin' ? SUPER_ADMIN_NAV : ADMIN_NAV} />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader fullScreen label="Opening your school portal…" />}>
      <RoutePageTitle />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/super_admin" element={<Navigate to="/super-admin" replace />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><SidebarLayout nav={SUPER_ADMIN_NAV} /></ProtectedRoute>}>
        <Route index element={<SuperAdminDashboard />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute roles={['super_admin', 'admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/promote" element={<PromoteStudents />} />
        <Route path="students/:id/qr-card" element={<StudentQrCard />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="staff" element={<StaffDirectory />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="classes" element={<Classes />} />
        <Route path="classes/structure-builder" element={<StructureBuilder />} />
        <Route path="classes/:id" element={<ClassDetail />} />
        <Route path="houses" element={<HouseSystem />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="class-subjects" element={<ClassSubjects />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="attendance/scanner" element={<GateScanner />} />
        <Route path="kitchen" element={<Kitchen />} />
        <Route path="academic-terms" element={<AcademicTerms />} />
        <Route path="grading/marks" element={<MarksEntry />} />
        <Route path="grading/broadsheet" element={<Broadsheet />} />
        <Route path="grading/report-cards" element={<ReportCards />} />
        <Route path="grading/release" element={<ResultsRelease />} />
        <Route path="remarks/sheet" element={<RemarkSheet />} />
        <Route path="remarks/setup" element={<RemarksSetup />} />
        <Route path="fees/structures" element={<FeeStructures />} />
        <Route path="fees/debtors" element={<Debtors />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="receipts/:paymentId" element={<Receipt />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="trash" element={<Trash />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><SidebarLayout nav={TEACHER_NAV} /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="gate-scanner" element={<GateScanner />} />
        <Route path="attendance" element={<AttendanceMark />} />
        <Route path="marks" element={<MarksEntry />} />
        <Route path="remarks" element={<RemarkSheet />} />
        <Route path="houses" element={<HouseSystem />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="chat" element={<TeacherChat />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>

      <Route path="/kitchen" element={<ProtectedRoute roles={['super_admin', 'admin', 'kitchen']}><SidebarLayout nav={KITCHEN_NAV} /></ProtectedRoute>}>
        <Route index element={<Kitchen />} />
      </Route>

      <Route path="/accountant" element={<ProtectedRoute roles={['accountant']}><SidebarLayout nav={ACCOUNTANT_NAV} /></ProtectedRoute>}>
        <Route index element={<Debtors />} />
        <Route path="structures" element={<FeeStructures />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="receipts/:paymentId" element={<Receipt />} />
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
