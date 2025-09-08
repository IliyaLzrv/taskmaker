import { useEffect, useMemo, useState, useCallback } from 'react'
import axios from 'axios'
import { api, syncAuthToken } from './lib/api'
import { supabase } from './lib/supabase'


type AuthInfo = { userId: string; email?: string; role?: string } | null
export type Task = {
  id: string
  title: string
  description?: string | null
  status: 'PENDING' | 'COMPLETED'
  createdAt?: string
  deadline?: string | null
  assignedUserId?: string | null
}

type HealthRes = { ok: boolean }
type MeRes = { auth?: { userId: string; email?: string; role?: string } }
type ListTasksRes = { tasks: Task[] }
type CreateTaskRes = { task: Task }
type UpdateTaskRes = { task: Task }
type DeleteRes = { ok: true }

type TaskCreatePayload = {
  title: string
  description?: string
  assignedUserId?: string
  deadline?: string // ISO
}
type TaskUpdatePayload = {
  title?: string
  description?: string
  status?: 'PENDING' | 'COMPLETED'
  assignedUserId?: string | null
  deadline?: string | null
}

// --- helpers ---
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
type ZodFlatten = { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
function extractZodErrors(val: unknown): string | null {
  if (!isRecord(val)) return null
  const f = (val as ZodFlatten).fieldErrors
  const a = [...(f ? Object.values(f).flat() : []), ...((val as ZodFlatten).formErrors ?? [])]
  return a.length ? a.join(', ') : null
}

function toMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data
    if (typeof data === 'string') return data
    if (isRecord(data) && 'error' in data) {
      const raw = (data as Record<string, unknown>).error
      if (typeof raw === 'string') return raw
      const z = extractZodErrors(raw); if (z) return z
      try { return JSON.stringify(raw) } catch { /* empty */ }
    }
    return err.message || 'Request failed'
  }
  return 'Something went wrong'
}


export default function App() {
  const [health, setHealth] = useState('checking...')
  const [auth, setAuth] = useState<AuthInfo>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('') // datetime-local
  const [assignedUserId, setAssignedUserId] = useState('')

  const isLoggedIn = !!auth?.userId

const fetchTasks = useCallback(async () => {
  try {
    const res = await api.get<ListTasksRes>('/tasks')
    setTasks(res.data.tasks ?? [])
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      setErr('Please log in to view tasks.')
    } else {
      setErr(toMessage(e))
    }
  }
}, [])

const refreshAll = useCallback(async () => {
  setErr(null)
  // quick health with a small timeout helps surface server-down situations
  try {
    const res = await api.get<HealthRes>('/health', { timeout: 3000 })
    setHealth(res.data.ok ? 'ok' : 'not ok')
  } catch {
    setHealth('not ok')
  }

  let newAuth: AuthInfo = null
  try {
    const me = await api.get<MeRes>('/auth/me')
    newAuth = me.data.auth ?? null
  } catch {/* not logged */}
  setAuth(newAuth)

  if (newAuth) await fetchTasks()
  else setTasks([])
}, [fetchTasks])


  async function onCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      const payload: TaskCreatePayload = { title }
      if (description) payload.description = description
      if (deadline) payload.deadline = new Date(deadline).toISOString()
      if (assignedUserId) payload.assignedUserId = assignedUserId

      const res = await api.post<CreateTaskRes>('/tasks', payload)
      // reset & prepend
      setTitle('')
      setDescription('')
      setDeadline('')
      setAssignedUserId('')
      setTasks((t) => [res.data.task, ...t])
    } catch (e) {
      const msg = toMessage(e)
      // Likely admin restriction or zod error; show clearly
      setErr(msg || 'Failed to create task.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(task: Task) {
    const next: TaskUpdatePayload['status'] = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING'
    try {
      const res = await api.patch<UpdateTaskRes>(`/tasks/${task.id}`, { status: next })
      setTasks((list) => list.map((t) => (t.id === task.id ? res.data.task : t)))
    } catch (e) {
      setErr(toMessage(e))
    }
  }

  async function removeTask(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return
    try {
      await api.delete<DeleteRes>(`/tasks/${task.id}`)
      setTasks((list) => list.filter((t) => t.id !== task.id))
    } catch (e) {
      setErr(toMessage(e))
    }
  }

  async function login(email: string, password: string) {
  setErr(null)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { setErr(error.message); return }
  // ensure axios has the fresh token before the first API call
  await syncAuthToken()
  await refreshAll()
}

async function logout() {
  await supabase.auth.signOut().catch(() => {})
  await syncAuthToken()  // clear token for axios immediately
  // instant UI update
  setAuth(null); setTasks([]); setErr(null)
}



  useEffect(() => {
    // initial
    refreshAll()

    // Supabase auth changes (login/logout/refresh/initial)
    const authChanged = () => refreshAll()
    window.addEventListener('app:auth-changed', authChanged)

    // 401 from API → force login view (quietly)
    const unauthorized = () => {
      setAuth(null)
      setTasks([])
      setErr(null) // don't show "Session expired" on first load / logout
    }
    window.addEventListener('app:unauthorized', unauthorized)

    // Also sync across tabs via Supabase (optional but nice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // We already get app:auth-changed; this keeps other tabs in sync too
    })

    return () => {
      window.removeEventListener('app:auth-changed', authChanged)
      window.removeEventListener('app:unauthorized', unauthorized)
      subscription.unsubscribe()
    }
  }, [refreshAll])


  return (
    <div className="container stack">
      <header className="card">
        <div className="row">
          <div className="h1">Task Maker</div>
          <span className="tag">API health: <span className="mono">{health}</span></span>
          <div className="right" />
          {isLoggedIn ? (
            <div className="row">
              <div className="small">Logged in as <span className="mono">{auth?.email || auth?.userId}</span></div>
              <button className="btn ghost" onClick={logout}>Sign out</button>
            </div>
          ) : <LoginBox onLogin={login} /> }
        </div>
        {err && <div className="small" style={{ color: 'var(--err)', marginTop: 8 }}>{err}</div>}
      </header>

      <section className="card">
        <div className="h2">Create Task <span className="small">(admin only)</span></div>
        {!isLoggedIn ? (
          <div className="small">Log in to create tasks.</div>
        ) : (
          <form className="stack" onSubmit={onCreateTask}>
            <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="textarea" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="row">
              <input className="dt" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <input className="input" placeholder="Assign to User ID (optional)" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} />
              <div className="right" />
              <button className="btn primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
            </div>
            <div className="small">If you’re not ADMIN, the server returns 403 and we’ll show the reason above.</div>
          </form>
        )}
      </section>

      <section className="card">
        <div className="h2">Tasks</div>
        {!isLoggedIn ? (
          <div className="small">Log in to view tasks.</div>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 8 }}>
              <button className="btn ghost" onClick={fetchTasks}>Reload</button>
              <div className="small">Only your tasks are listed unless you’re ADMIN.</div>
            </div>
            <ul className="list">
              {tasks.map((t) => (
                <li key={t.id} className="item">
                  <div className="row">
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <span className="tag">{t.status}</span>
                    <div className="right" />
                    <button className="btn ok" onClick={() => toggleStatus(t)}>
                      Mark {t.status === 'PENDING' ? 'Completed' : 'Pending'}
                    </button>
                    <button className="btn err" onClick={() => removeTask(t)}>Delete</button>
                  </div>
                  {t.description ? <div className="small" style={{ marginTop: 6 }}>{t.description}</div> : null}
                  <div className="row small" style={{ marginTop: 6 }}>
                    {t.deadline && <div>Deadline: <span className="mono">{new Date(t.deadline).toLocaleString()}</span></div>}
                    {t.assignedUserId && <div>Assignee: <span className="mono">{t.assignedUserId}</span></div>}
                    {t.createdAt && <div className="right">Created: <span className="mono">{new Date(t.createdAt).toLocaleString()}</span></div>}
                  </div>
                </li>
              ))}
            </ul>
            {tasks.length === 0 && <div className="small">No tasks (or you don’t have permission to see existing ones).</div>}
          </>
        )}
      </section>
    </div>
  )
}

function LoginBox({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('password')
  const [busy, setBusy] = useState(false)

  const canSubmit = useMemo(() => email.length > 0 && password.length > 0 && !busy, [email, password, busy])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try { await onLogin(email, password) } finally { setBusy(false) }
  }

  return (
    <form className="row" onSubmit={submit}>
      <input className="input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn primary" disabled={!canSubmit}>{busy ? '...' : 'Sign in'}</button>
    </form>
  )
}
