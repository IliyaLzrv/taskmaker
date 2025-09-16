import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@site.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  type LocationState = { from?: { pathname?: string } } | null;
  const state = loc.state as LocationState;
  const from = state?.from?.pathname;
  const canSubmit = useMemo(() => !!email && !!password && !busy, [email, password, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const u = await login(email.trim(), password);
      const isBadFrom = !from || ['/login', '/register', '/'].includes(from);
      const target = isBadFrom ? (u.role === 'ADMIN' ? '/admin' : '/tasks') : from;
      nav(target, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="h2">Login</div>
      <form className="row" onSubmit={submit} noValidate>
        <input
          className="input"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          disabled={busy}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={busy}
          required
        />
        <button className="btn primary" type="submit" disabled={!canSubmit}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {err && <div className="small" style={{ color: 'var(--err)' }}>{err}</div>}
      <p>Don&apos;t have an account? <Link to="/register">Register</Link></p>
    </section>
  );
}
