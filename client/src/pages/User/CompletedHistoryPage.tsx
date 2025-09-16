import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  updatedAt?: string
  assignedUserId?: string | null
}

export default function CompletedHistoryPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setErr(null); setLoading(true)
      try {
        const { data } = await api.get('/api/tasks')
        const list: Task[] = Array.isArray(data) ? data : (data?.items ?? [])
        const mine = user ? list.filter(t => t.status === 'COMPLETED')
                            .filter(t => !t.assignedUserId || t.assignedUserId === user.id)
                          : list.filter(t => t.status === 'COMPLETED')
        setTasks(mine)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load history')
      } finally { setLoading(false) }
    })()
  }, [user?.id])

  return (
    <section className="stack">
      <header className="row">
        <h2 className="h2">Completed tasks</h2>
        <div className="right" />
        <Link className="btn ghost" to="/tasks">Back</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}
      {!loading && tasks.length === 0 && !err && (
        <div className="card">No completed tasks yet.</div>
      )}

      <div className="stack">
        {tasks.map(t => (
          <div key={t.id} className="card row">
            <div className="stack">
              <div className="h3">{t.title}</div>
              <div className="small mono">{t.updatedAt && `Completed: ${new Date(t.updatedAt).toLocaleString()}`}</div>
            </div>
            <div className="right" />
            <Link className="btn ghost" to={`/tasks/${t.id}`}>Open</Link>
          </div>
        ))}
      </div>
    </section>
  )
}
