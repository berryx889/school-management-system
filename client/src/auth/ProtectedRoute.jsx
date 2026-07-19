import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { ForcedPasswordGate } from '../components/ChangePassword.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  if (user.must_change_password) return <ForcedPasswordGate />;
  return children;
}
