import { useEffect, useState } from 'react'
import { api } from './lib/api'

export default function App() {
  const [health, setHealth] = useState<string>('checking...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const h = await api.get('/health')
      setHealth(h.data.ok ? 'ok' : 'not ok')

      const list = await api.get('/tasks')
      setTasks(list.data.tasks)
    })()
  }, [])

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Task Maker</h1>
      <div>API health: <span className="font-mono">{health}</span></div>
      <h2 className="text-xl font-semibold mt-4">Tasks</h2>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="border rounded p-3">
            <div className="font-medium">{t.title}</div>
            <div className="text-sm opacity-70">{t.status}</div>
          </li>
        ))}
      </ul>
    </main>
  )
}
