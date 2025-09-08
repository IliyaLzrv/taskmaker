import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import BackButton from '../../components/BackButton'

type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  deadline?: string | null
  createdAt?: string
  updatedAt?: string
}

type Message = {
  id: string
  body: string
  createdAt?: string
  author?: { id: string; email?: string }
}

// server may return either Task or { task: Task }
type TaskResp = Task | { task: Task }

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
function pickTask(data: unknown): Task {
  if (isObject(data) && 'task' in data) return (data as { task: Task }).task
  return data as Task
}
function extractMessages(data: unknown): Message[] {
  if (Array.isArray(data)) return data as Message[]
  if (isObject(data)) {
    const items = (data as Record<string, unknown>).items
    if (Array.isArray(items)) return items as Message[]
    const msgs = (data as Record<string, unknown>).messages
    if (Array.isArray(msgs)) return msgs as Message[]
  }
  return []
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<string>('')

  const [messages, setMessages] = useState<Message[]>([])
  const [msgBody, setMsgBody] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    setErr(null); setLoading(true)
    try {
      // Task
      const tRes = await api.get<TaskResp>(`/api/tasks/${id}`)
      const taskObj = pickTask(tRes.data)
      setTask(taskObj)
      setTitle(taskObj?.title ?? '')
      setDescription(taskObj?.description ?? '')
      setDeadline(taskObj?.deadline ? taskObj.deadline.slice(0, 16) : '')

      // Messages
      const mRes = await api.get(`/api/tasks/${id}/messages`)
      const list = extractMessages(mRes.data)
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      setMessages(list)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveTask() {
    if (!id) return
    setBusy(true)
    try {
      await api.patch(`/api/tasks/${id}`, {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
      })
      await loadAll()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally { setBusy(false) }
  }

  async function markDone() {
    if (!id) return
    setBusy(true)
    try {
      await api.patch(`/api/tasks/${id}`, { status: 'COMPLETED' })
      await loadAll()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally { setBusy(false) }
  }

  async function removeTask() {
    if (!id) return
    if (!confirm('Delete this task?')) return
    setBusy(true)
    try {
      await api.delete(`/api/tasks/${id}`)
      nav('/tasks', { replace: true })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    } finally { setBusy(false) }
  }

  async function addMessage() {
    if (!id || !msgBody.trim()) return
    const body = msgBody.trim()
    setMsgBody('')
    try {
      await api.post(`/api/tasks/${id}/messages`, { body })
      const mRes = await api.get(`/api/tasks/${id}/messages`)
      const list = extractMessages(mRes.data)
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      setMessages(list)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to post message')
    }
  }

  if (loading) return <div className="card">Loading…</div>
  if (err) return <div className="card" style={{ color: 'var(--err)' }}>{err}</div>
  if (!task) return <div className="card">Task not found.</div>

  return (
    <section className="stack">
      <header className="row">
          <BackButton fallback="/tasks" />
  <div className="right" />
        <h2 className="h2">Task Details</h2>
        <div className="right" />
        <Link className="btn ghost" to="/tasks">Back to tasks</Link>
      </header>

      <div className="card stack">
        <div className="row">
          <div className="badge">{task.status}</div>
          <div className="right small mono">
            {task.updatedAt && <>Updated: {new Date(task.updatedAt).toLocaleString()}</>}
          </div>
        </div>

        <label className="stack">
          <span className="small mono">Title</span>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </label>

        <label className="stack">
          <span className="small mono">Description</span>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </label>

        <label className="stack">
          <span className="small mono">Deadline</span>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </label>

        <div className="row">
          <button className="btn primary" disabled={busy} onClick={saveTask}>
            {busy ? '...' : 'Save'}
          </button>
          {task.status !== 'COMPLETED' && (
            <button className="btn" disabled={busy} onClick={markDone}>Mark done</button>
          )}
          <div className="right" />
          <button className="btn ghost" disabled={busy} onClick={removeTask}>Delete</button>
        </div>
      </div>

      <div className="card stack">
        <div className="h3">Comments</div>
        <div className="stack">
          {messages.length === 0 && <div className="small">No messages yet.</div>}
          {messages.map(m => (
            <div key={m.id} className="row">
              <div className="stack" style={{ flex: 1 }}>
                <div>{m.body}</div>
                <div className="small mono">
                  {m.author?.email || m.author?.id || 'unknown'} • {m.createdAt && new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <input
            className="input"
            placeholder="Write a comment…"
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMessage(); } }}
          />
          <button className="btn" onClick={addMessage}>Send</button>
        </div>
      </div>
    </section>
  )
}
