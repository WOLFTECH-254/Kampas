
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleRoute({ children, allowedRoles, redirectTo = '/explore' }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
