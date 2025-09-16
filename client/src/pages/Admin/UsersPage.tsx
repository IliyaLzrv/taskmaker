import { useEffect, useState } from 'react';
import { api } from '../../lib/api';


type User = { id: string; email: string; role: 'ADMIN' | 'USER' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null); setLoading(true);
    try {
      const {data} = await api.get('/api/admin/users');
      setUsers(Array.isArray(data) ? data : (data?.items ?? data?.users ?? []))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load users');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function promote(id: string, role: 'ADMIN' | 'USER') {
    try {
      await api.patch(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update role');
    }
  }

  return (
    <section className="stack">
      <header className="row">
          
        <h2 className="h2">Users</h2>
        <div className="right" />
        <button className="btn ghost" onClick={load}>Refresh</button>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      <div className="stack">
        {users.map(u => (
          <div key={u.id} className="card row">
            <div className="stack">
              <div className="h3">{u.email}</div>
              <div className="small mono">{u.id}</div>
            </div>
            <div className="right" />
            <div className="row">
              <span className="badge">{u.role}</span>
              {u.role !== 'ADMIN'
                ? <button className="btn" onClick={()=>promote(u.id, 'ADMIN')}>Make Admin</button>
                : <button className="btn ghost" onClick={()=>promote(u.id, 'USER')}>Make User</button>
              }
            </div>
          </div>
        ))}
      </div>

      {!loading && users.length === 0 && !err && <div className="card">No users found.</div>}
    </section>
  );
}
