import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import BackButton from '../../components/BackButton';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'COMPLETED';
  deadline?: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await api.get('/api/tasks');
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setTasks(list.filter((t: Task) => t.status !== 'COMPLETED'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally { setLoading(false); }
  }

  async function markDone(id: string) {
    try {
      await api.patch(`/api/tasks/${id}`, { status: 'COMPLETED' });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="stack">
      <header className="row">
          <BackButton fallback="/tasks" />
  <div className="right" />
        <h2 className="h2">My Tasks</h2>
        <div className="right" />
        <Link className="btn primary" to="/tasks/create">+ New Task</Link>
        <Link className="btn ghost" to="/tasks/done">Completed</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      {!loading && tasks.length === 0 && !err && (
        <div className="card">No tasks yet. Create your first one!</div>
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
            <button className="btn" onClick={() => markDone(t.id)}>Mark done</button>
          </div>
        ))}
      </div>
    </section>
  );
}
