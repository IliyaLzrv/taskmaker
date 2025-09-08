// client/src/pages/RegisterPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string|null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const u = await register({ email, password, fullName })
      nav(u.role === 'ADMIN' ? '/admin' : '/tasks', { replace: true })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <div className="h2">Register</div>
      <form className="row" onSubmit={submit}>
        <input className="input" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn primary" disabled={busy}>{busy ? '...' : 'Create account'}</button>
      </form>
      {err && <div className="small" style={{color:'var(--err)'}}>{err}</div>}
      <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </section>
  )
}
