import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext' 

type Me = { id: string; email: string; role: 'ADMIN' | 'USER' }

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
  const { authFetch, session } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setErr(null); setLoading(true)
        const meRes = await authFetch('/api/users/me')
        if (!meRes.ok) throw new Error('Failed to load profile')
        const meJson = (await meRes.json()) as Me

        const tRes = await authFetch('/api/tasks')
        if (!tRes.ok) throw new Error('Failed to load tasks')
        const tJson = (await tRes.json()) as Task[]

        if (mounted) {
          setMe(meJson)
          setTasks(Array.isArray(tJson) ? tJson : [])
        }
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [authFetch, session]) 

  const stats = useMemo(() => {
    if (!me) return { assignedCount: 0, createdCount: 0, pending: 0, done: 0, assigned: [] as Task[] }
    const assigned = tasks.filter(t => t.assignedUserId === me.id)
    const created  = tasks.filter(t => t.createdById === me.id)
    const pending  = assigned.filter(t => t.status !== 'COMPLETED').length
    const done     = assigned.filter(t => t.status === 'COMPLETED').length
    return { assignedCount: assigned.length, createdCount: created.length, pending, done, assigned }
  }, [tasks, me])

  if (err) return <div className="card" style={{color:'var(--err)'}}>{err}</div>
  if (loading || !me) return <div className="card">Loading…</div>

  return (
    <section className="stack">
      <div className="card stack">
        <div className="h2">Profile</div>
        <div><b>Email:</b> {me.email}</div>
        <div><b>Role:</b> {me.role}</div>
        <div><b>ID:</b> <span className="mono">{me.id}</span></div>
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
