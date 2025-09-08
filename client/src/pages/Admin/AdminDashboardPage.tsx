import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

type Task = {
  id: string
  title: string
  status: 'PENDING' | 'COMPLETED'
  deadline?: string | null
  createdAt?: string
  updatedAt?: string
  assignedUser?: { id: string; email: string | null } | null
  createdBy?: { id: string; email: string | null } | null
}

export default function AdminDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setErr(null); setLoading(true)
        const { data } = await api.get<Task[]>('/api/admin/tasks')
        setTasks(Array.isArray(data) ? data : [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally { setLoading(false) }
    })()
  }, [])

  const { pending, completed } = useMemo(() => ({
    pending: tasks.filter(t => t.status !== 'COMPLETED').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
  }), [tasks])

  return (
    <section className="stack">
      <header className="row">
        <h2 className="h2">Admin Dashboard</h2>
        <div className="right" />
        <Link className="btn primary" to="/admin/create">+ Create Task</Link>
        <Link className="btn ghost" to="/admin/users">Users</Link>
        <Link className="btn ghost" to="/admin/requests">Requests</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{ color:'var(--err)' }}>{err}</div>}

      {!loading && !err && (
        <>
          <div className="row">
            <div className="card" style={{flex:1}}>
              <div className="h3">Pending</div>
              <div className="h1">{pending}</div>
            </div>
            <div className="card" style={{flex:1}}>
              <div className="h3">Completed</div>
              <div className="h1">{completed}</div>
            </div>
          </div>

          <div className="card stack">
            <div className="row h3">
              <div style={{flex:2}}>Title</div>
              <div style={{flex:1}}>Status</div>
              <div style={{flex:2}}>Assignee</div>
              <div style={{flex:2}}>Creator</div>
              <div style={{flex:2}}>Deadline</div>
              <div style={{width:100}} />
            </div>
            {tasks.map(t => (
              <div key={t.id} className="row">
                <div style={{flex:2}}>{t.title}</div>
                <div style={{flex:1}}><span className="badge">{t.status}</span></div>
                <div style={{flex:2}}>{t.assignedUser?.email ?? <em>unassigned</em>}</div>
                <div style={{flex:2}}>{t.createdBy?.email ?? '—'}</div>
                <div style={{flex:2}}>{t.deadline ? new Date(t.deadline).toLocaleString() : '—'}</div>
                <div style={{width:100, textAlign:'right'}}>
                  <Link className="btn ghost" to={`/tasks/${t.id}`}>Open</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
