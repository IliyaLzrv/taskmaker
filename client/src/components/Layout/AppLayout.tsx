import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Link({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `btn ghost ${isActive ? 'mono' : ''}`}
      end
    >
      {children}
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()

  const doLogout = () => {
    logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="container stack">
      <header className="card row">
        <div className="h1">Task Maker</div>
        <div className="right" />

        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <div className="row">
            <Link to="/me">Profile</Link>

            {isAdmin ? (
              <>
                <Link to="/admin">Dashboard</Link>
                <Link to="/admin/create">Create</Link>
                <Link to="/admin/users">Users</Link>
                <Link to="/admin/requests">Requests</Link>
              </>
            ) : (
              <>
                <Link to="/tasks">Assigned</Link>
                <Link to="/tasks/browse">Browse</Link>
                <Link to="/tasks/done">History</Link>
              </>
            )}

            <button className="btn" onClick={doLogout}>Logout</button>
          </div>
        )}
      </header>

      <Outlet />
    </div>
  )
}