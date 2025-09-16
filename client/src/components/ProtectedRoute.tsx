import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = { children: React.ReactNode; role?: 'ADMIN' | 'USER' };

export default function ProtectedRoute({ children, role }: Props) {
  const { user, authToken, loading, refreshMe } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(false);
  const triedRef = useRef(false);

  useEffect(() => {
    if (!loading && authToken && !user && !triedRef.current) {
      triedRef.current = true;
      setChecking(true);
      refreshMe().finally(() => setChecking(false));
    }
  }, [loading, authToken, user, refreshMe]);

  
  if (loading || checking) return <div className="card">Loading…</div>;

  
  if (!authToken && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  
  if (role && user && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/tasks'} replace />;
  }

  return <>{children}</>;
}
