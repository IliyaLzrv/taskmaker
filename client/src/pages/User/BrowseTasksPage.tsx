import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import axios from 'axios'

type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  deadline?: string | null
  assignedUser?: { id: string; email: string | null } | null
}

function getErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

export default function BrowseTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [requesting, setRequesting] = useState<string | null>(null)

  async function load() {
    setErr(null); setLoading(true)
    try {
      const { data } = await api.get<Task[]>('/api/tasks/browse')
      setTasks(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Failed to load'))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function requestTask(id: string) {
    setRequesting(id)
    try {
      await api.post(`/api/tasks/${id}/requests`)
      setTasks(prev => prev.filter(t => t.id !== id)) // optimistic remove
      alert('Request sent!')
    } catch (e: unknown) {
      alert(getErrorMessage(e))
    } finally {
      setRequesting(null)
    }
  }

  return (
    <section className="stack">
      <header className="row">
        <h2 className="h2">Available tasks</h2>
        <div className="right" />
        <Link className="btn ghost" to="/tasks">Assigned</Link>
        <Link className="btn ghost" to="/tasks/done">History</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      <div className="stack">
        {tasks.map(t => (
          <div key={t.id} className="card row">
            <div className="stack" style={{flex:1}}>
              <div className="h3">{t.title}</div>
              {t.description && <div className="small">{t.description}</div>}
              {t.deadline && <div className="small mono">Due: {new Date(t.deadline).toLocaleString()}</div>}
            </div>
            <div className="right" />
            <Link className="btn ghost" to={`/tasks/${t.id}`}>Open</Link>
            <button
              className="btn"
              disabled={!!t.assignedUser || requesting === t.id}
              onClick={() => requestTask(t.id)}
            >
              {requesting === t.id ? '...' : (t.assignedUser ? 'Assigned' : 'Request')}
            </button>
          </div>
        ))}
        {!loading && tasks.length === 0 && !err && <div className="card">No available tasks.</div>}
      </div>
    </section>
  )
}
