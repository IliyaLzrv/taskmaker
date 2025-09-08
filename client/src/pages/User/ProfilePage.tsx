import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Link } from 'react-router-dom'

type ProfileResp = {
  auth: { userId: string; email?: string; role?: 'ADMIN' | 'USER' }
  profile: { id: string; email: string; role: 'ADMIN' | 'USER' }
}
type Task = {
  id: string
  title: string
  status: 'PENDING' | 'COMPLETED'
  assignedUserId?: string | null
  createdById?: string
  updatedAt?: string
  createdAt?: string
}

export default function ProfilePage() {
  const [me, setMe] = useState<ProfileResp | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        setErr(null); setLoading(true)
        const [meRes, tRes] = await Promise.all([
          api.get<ProfileResp>('/api/auth/me'),
          api.get<Task[]>('/api/tasks'),
        ])
        setMe(meRes.data)
        setTasks(Array.isArray(tRes.data) ? tRes.data : [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load profile')
      } finally { setLoading(false) }
    })()
  }, [])

  const stats = useMemo(() => {
    const assigned = tasks.filter(t => t.assignedUserId === me?.profile.id)
    const created  = tasks.filter(t => t.createdById === me?.profile.id)
    const pending  = assigned.filter(t => t.status !== 'COMPLETED').length
    const done     = assigned.filter(t => t.status === 'COMPLETED').length
    return { assignedCount: assigned.length, createdCount: created.length, pending, done, assigned }
  }, [tasks, me?.profile.id])

  if (err) return <div className="card" style={{color:'var(--err)'}}>{err}</div>
  if (loading || !me) return <div className="card">Loading…</div>

  const { profile } = me
  return (
    <section className="stack">
      <div className="card stack">
        <div className="h2">Profile</div>
        <div><b>Email:</b> {profile.email}</div>
        <div><b>Role:</b> {profile.role}</div>
        <div><b>ID:</b> <span className="mono">{profile.id}</span></div>
      </div>

      <div className="row">
        <div className="card" style={{flex:1}}>
          <div className="h3">Assigned to me</div>
          <div className="h1">{stats.assignedCount}</div>
          <div className="small">Pending: {stats.pending} • Completed: {stats.done}</div>
        </div>
        <div className="card" style={{flex:1}}>
          <div className="h3">Created by me</div>
          <div className="h1">{stats.createdCount}</div>
        </div>
      </div>

      <div className="card stack">
        <div className="h3">My latest assigned</div>
        {stats.assigned.slice(0,5).map(t=>(
          <div key={t.id} className="row">
            <span>{t.title}</span>
            <span className="right">
              <span className="badge">{t.status}</span>
              <Link className="btn ghost" to={`/tasks/${t.id}`} style={{marginLeft:8}}>Open</Link>
            </span>
          </div>
        ))}
        {stats.assigned.length === 0 && <div className="small">Nothing assigned yet.</div>}
      </div>
    </section>
  )
}
