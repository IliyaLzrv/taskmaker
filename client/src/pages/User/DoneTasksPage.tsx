import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import BackButton from '../../components/BackButton';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'COMPLETED';
  updatedAt?: string;
  deadline?: string | null;
};

export default function DoneTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        // If supported: const data = await api('/api/tasks?status=COMPLETED');
        const {data} = await api.get('/api/tasks');
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setTasks(list.filter((t: Task) => t.status === 'COMPLETED'));
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="stack">
      <header className="row">
          <BackButton fallback="/tasks" />
  <div className="right" />
        <h2 className="h2">Completed</h2>
        <div className="right" />
        <Link className="btn ghost" to="/tasks">Back to tasks</Link>
      </header>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{color:'var(--err)'}}>{err}</div>}

      {!loading && tasks.length === 0 && !err && (
        <div className="card">You don’t have completed tasks yet.</div>
      )}

      <div className="stack">
        {tasks.map(t => (
          <div key={t.id} className="card">
            <div className="row">
              <div className="h3">{t.title}</div>
              <div className="right small mono">{t.updatedAt && `Completed: ${new Date(t.updatedAt).toLocaleString()}`}</div>
            </div>
            {t.description && <div className="small">{t.description}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
