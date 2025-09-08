import { useNavigate } from 'react-router-dom'

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const nav = useNavigate()
  return (
    <button className="btn ghost" type="button" onClick={() => {
      if (window.history.length > 1) nav(-1)
      else nav(fallback)
    }}>
      ← Back
    </button>
  )
}
