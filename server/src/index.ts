import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import cors, { type CorsOptions } from 'cors'
import { router as authRouter } from './routes/auth'
import { router as taskRouter } from './routes/tasks'
import { authMiddleware } from './middleware/auth'
import { ensureProfile } from './middleware/ensureProfile'
import { prisma } from './db'
import { router as messagesRouter } from './routes/messages'
import { router as adminRouter } from './routes/admin'
import 'dotenv/config'



const allowed = (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const corsOptions: CorsOptions = {
  // reflect only known origins (no "*", required when credentials: true)
  origin(origin, cb) {
    // allow non-browser tools (curl/Postman = no Origin)
    if (!origin) return cb(null, true)
    if (allowed.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}

const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/tasks', authMiddleware, ensureProfile, taskRouter)
app.use('/api/tasks/:id/messages', authMiddleware, ensureProfile, messagesRouter)
app.get('/api/debug/db', async (_req, res) => {
  try {
    const [users, tasks] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
    ])
    res.json({
      ok: true,
      userCount: users,
      taskCount: tasks,
      dbHost: process.env.DATABASE_URL?.split('@')[1] // quick peek where we're connected
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

app.use('/api/tasks', authMiddleware, ensureProfile, taskRouter)
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/admin', authMiddleware, ensureProfile, adminRouter)
// protect all task routes with auth
app.use('/api/tasks', authMiddleware, taskRouter)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API listening on :${port}`))
