import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { dashboardPath } from './roleRoutes.js';
import { ForcedPasswordGate } from '../components/ChangePassword.jsx';
import BrandThemeSync from '../components/BrandThemeSync.jsx';
import { useIdleLogout } from '../hooks/useIdleLogout.js';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  useIdleLogout(); // auto sign-out after inactivity (no-op until logged in)
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />;
  if (user.must_change_password) return <ForcedPasswordGate />;
  return (
    <>
      <BrandThemeSync />
      {children}
    </>
  );
}
