import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import BackButton from '../../components/BackButton'
import { useAuth } from '../../context/AuthContext'

type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  deadline?: string | null
  createdAt?: string
  updatedAt?: string
  assignedUserId?: string | null
  createdById?: string
}

type Message = {
  id: string
  body: string
  createdAt?: string
  author?: { id: string; email?: string }
}

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

function isoToLocalInputValue(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function localInputValueToIso(local: string) {
  return new Date(local).toISOString()
}

type ApiErrorPayload = { error?: { message?: string }; message?: string }
type MaybeAxiosError = { response?: { data?: ApiErrorPayload } }

function errorMessageFrom(err: unknown): string {
  if (isObject(err) && 'response' in err) {
    const r = (err as MaybeAxiosError).response
    const data = r?.data
    if (data?.error?.message) return data.error.message
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : 'Request failed'
}

type PatchBody = Partial<{
  title: string
  description: string | null
  deadline: string | null
  status: 'PENDING' | 'COMPLETED'
}>

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { user } = useAuth()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<string>('')

  const [messages, setMessages] = useState<Message[]>([])
  const [msgBody, setMsgBody] = useState('')
  const [busy, setBusy] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isCreator = !!(task && user && task.createdById === user.id) 
  const isAssignee = !!(task && user && task.assignedUserId === user.id)

  const canEditFull = isAdmin 
  const canDelete = isAdmin
  const canUpdateStatus = isAdmin || isAssignee
  const canComment = isAdmin || isCreator || isAssignee

  const loadAll = useCallback(async () => {
    if (!id) return
    setErr(null); setLoading(true)
    try {
      const tRes = await api.get<TaskResp>(`/api/tasks/${id}`)
      const taskObj = pickTask(tRes.data)
      setTask(taskObj)
      setTitle(taskObj?.title ?? '')
      setDescription(taskObj?.description ?? '')
      setDeadline(isoToLocalInputValue(taskObj?.deadline ?? null))

  
      const mRes = await api.get(`/api/tasks/${id}/messages`)
      const list = extractMessages(mRes.data).sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      )
      setMessages(list)
    } catch (e: unknown) {
      setErr(errorMessageFrom(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  function buildPatchBody(curr: Task): PatchBody {
    const body: PatchBody = {}

    const t = title.trim()
    if (t && t !== curr.title) body.title = t

    const d = description.trim()
    const currDesc = curr.description ?? ''
    if (d !== currDesc) body.description = d || null

    const currLocal = isoToLocalInputValue(curr.deadline ?? null)
    if (deadline !== currLocal) body.deadline = deadline ? localInputValueToIso(deadline) : null

    return body
  }

  async function saveTask() {
    if (!id || !task || !canEditFull) return
    setBusy(true)
    try {
      const body = buildPatchBody(task)
      if (Object.keys(body).length === 0) {
        setBusy(false)
        return
      }
      await api.patch(`/api/tasks/${id}`, body)
      await loadAll()
    } catch (e: unknown) {
      setErr(errorMessageFrom(e))
    } finally { setBusy(false) }
  }

  async function markDone() {
    if (!id || !canUpdateStatus) return
    setBusy(true)
    try {
      await api.patch(`/api/tasks/${id}`, { status: 'COMPLETED' } satisfies PatchBody)
      await loadAll()
    } catch (e: unknown) {
      setErr(errorMessageFrom(e))
    } finally { setBusy(false) }
  }

  async function removeTask() {
    if (!id || !canDelete) return
    if (!confirm('Delete this task?')) return
    setBusy(true)
    try {
      await api.delete(`/api/tasks/${id}`)
      nav('/tasks', { replace: true })
    } catch (e: unknown) {
      setErr(errorMessageFrom(e))
    } finally { setBusy(false) }
  }

  async function addMessage() {
    if (!id || !msgBody.trim() || !canComment) return
    const body = msgBody.trim()
    setMsgBody('')
    try {
      await api.post(`/api/tasks/${id}/messages`, { body })
      const mRes = await api.get(`/api/tasks/${id}/messages`)
      const list = extractMessages(mRes.data).sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      )
      setMessages(list)
    } catch (e: unknown) {
      setErr(errorMessageFrom(e))
    }
  }

  if (loading) return <div className="card">Loading…</div>
  if (err) return <div className="card" style={{ color: 'var(--err)' }}>{err}</div>
  if (!task) return <div className="card">Task not found.</div>

  const titleEmpty = title.trim().length === 0

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
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!canEditFull}
            required={canEditFull}
          />
        </label>

        <label className="stack">
          <span className="small mono">Description</span>
          <textarea
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!canEditFull}
          />
        </label>

        <label className="stack">
          <span className="small mono">Deadline</span>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            disabled={!canEditFull}
          />
          <div className="row" style={{ gap: 8 }}>
            {deadline && canEditFull && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeadline('')}
                title="Clear deadline"
              >
                Clear
              </button>
            )}
          </div>
          <span className="small mono">
            Saved as RFC 3339 in UTC; clearing sends <code>null</code>.
          </span>
        </label>

        <div className="row">
          {canEditFull && (
            <button
              className="btn primary"
              disabled={busy || (titleEmpty && title !== task.title)}
              onClick={saveTask}
              title={titleEmpty && title !== task.title ? 'Title cannot be empty' : undefined}
            >
              {busy ? '...' : 'Save'}
            </button>
          )}

          {canUpdateStatus && task.status !== 'COMPLETED' && (
            <button className="btn" disabled={busy} onClick={markDone}>Mark done</button>
          )}

          <div className="right" />

          {canDelete && (
            <button className="btn ghost" disabled={busy} onClick={removeTask}>Delete</button>
          )}
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
            placeholder={canComment ? "Write a comment…" : "You don't have permission to comment"}
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMessage(); } }}
            disabled={!canComment}
          />
          <button className="btn" onClick={addMessage} disabled={!canComment}>Send</button>
        </div>
      </div>
    </section>
  )
}
