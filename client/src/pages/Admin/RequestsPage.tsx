import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Link } from 'react-router-dom'
import axios from 'axios'

type Req = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  createdAt: string
  task: { id: string; title: string }
  requester: { id: string; email: string }
}

function getErrorMessage(err: unknown, fallback = 'Action failed'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

export default function RequestsPage() {
  const [items, setItems] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setErr(null); setLoading(true)
    try {
      const { data } = await api.get<Req[]>('/api/admin/requests')
      setItems(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Failed to load requests'))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function act(id: string, action: 'APPROVE' | 'DENY') {
    try {
      await api.patch(`/api/admin/requests/${id}`, { action })
      setItems(prev => prev.filter(r => r.id !== id))
    } catch (e: unknown) {
      alert(getErrorMessage(e))
    }
  }

  return (
    <section className="stack">
      <header className="row">
        <h2 className="h2">Task Requests</h2>
        <div className="right" />
        <button className="btn ghost" onClick={load}>Refresh</button>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      <div className="card stack">
        <div className="row h3">
          <div style={{flex:2}}>Task</div>
          <div style={{flex:2}}>Requester</div>
          <div style={{flex:2}}>Requested at</div>
          <div style={{width:180}} />
        </div>
        {items.map(r => (
          <div key={r.id} className="row">
            <div style={{flex:2}}><Link to={`/tasks/${r.task.id}`}>{r.task.title}</Link></div>
            <div style={{flex:2}}>{r.requester.email}</div>
            <div style={{flex:2}}>{new Date(r.createdAt).toLocaleString()}</div>
            <div style={{width:180, textAlign:'right'}}>
              <button className="btn" onClick={()=>act(r.id,'APPROVE')}>Approve</button>
              <button className="btn ghost" onClick={()=>act(r.id,'DENY')}>Deny</button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !err && <div className="small">No pending requests.</div>}
      </div>
    </section>
  )
}
