import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

export default function CreateTaskPage() {
  const { isAdmin } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<string>('') 
  const [assigneeEmail, setAssigneeEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setErr('Title is required')
    setErr(null); setBusy(true)

    try {
      const payload: {
        title: string
        description: string | null
        deadline: string | null
        assigneeEmail?: string
      } = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
      }

      const email = assigneeEmail.trim()
      if (isAdmin && email) payload.assigneeEmail = email

      await api.post('/api/tasks', payload)
      nav('/admin', { replace: true })
    } catch (e) {
      let message = 'Failed to create task'
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { message?: string } | undefined
        message = data?.message || e.message || message
      } else if (e instanceof Error) {
        message = e.message
      }
      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <div className="h2">Create Task</div>
      <form className="stack" onSubmit={submit}>
        <input
          className="input"
          placeholder="Title"
          value={title}
          onChange={e=>setTitle(e.target.value)}
        />
        <textarea
          className="input"
          placeholder="Description (optional)"
          value={description}
          onChange={e=>setDescription(e.target.value)}
        />
        <input
          className="input"
          type="datetime-local"
          value={deadline}
          onChange={e=>setDeadline(e.target.value)}
        />

        {isAdmin && (
          <input
            className="input"
            placeholder="Assign to email (optional, admins only)"
            value={assigneeEmail}
            onChange={e=>setAssigneeEmail(e.target.value)}
          />
        )}

        <div className="row">
          <button className="btn primary" disabled={busy}>
            {busy ? '...' : 'Create'}
          </button>
          <div className="right" />
          <button className="btn ghost" type="button" onClick={()=>nav(-1)}>Cancel</button>
        </div>

        {err && <div className="small" style={{color:'var(--err)'}}>{err}</div>}
      </form>
    </section>
  )
}
