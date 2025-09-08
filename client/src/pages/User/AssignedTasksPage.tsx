import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  deadline?: string | null
  assignedUserId?: string | null
}

export default function AssignedTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setErr(null); setLoading(true)
    try {
      const { data } = await api.get<Task[]>('/api/tasks')
      const list = Array.isArray(data) ? data : []
      const mine = user ? list.filter(t => t.assignedUserId === user.id) : []
      setTasks(mine)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <section className="stack">
      <header className="row">
        <h2 className="h2">Assigned to me</h2>
        <div className="right" />
        <button className="btn ghost" onClick={load}>Refresh</button>
        <Link className="btn ghost" to="/tasks/browse">Browse</Link>
        <Link className="btn ghost" to="/tasks/done">History</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      {!loading && tasks.length === 0 && !err && (
        <div className="card">No tasks assigned to you yet.</div>
      )}

      <div className="stack">
        {tasks.map(t => (
          <div key={t.id} className="card row">
            <div className="stack">
              <div className="h3">{t.title}</div>
              {t.description && <div className="small">{t.description}</div>}
              {t.deadline && <div className="small mono">Due: {new Date(t.deadline).toLocaleString()}</div>}
            </div>
            <div className="right" />
            <Link className="btn ghost" to={`/tasks/${t.id}`}>Open</Link>
          </div>
        ))}
      </div>
    </section>
  )
}
