import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = { children: React.ReactNode; role?: 'ADMIN' | 'USER' }

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null // or a spinner

  // not logged in -> go to login, remember where we came from
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  // role mismatch -> send to the right home for their role
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/tasks'} replace />
  }

  return <>{children}</>
}
