import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface RoleGuardProps {
  allowedRoles: Array<'admin' | 'viewer'>;
  children: ReactNode;
  redirectTo?: string;
}

export default function RoleGuard({
  allowedRoles,
  children,
  redirectTo = '/dashboard',
}: RoleGuardProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
