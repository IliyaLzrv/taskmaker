import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { router as taskRouter } from './routes/tasks'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/tasks', taskRouter)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API listening on :${port}`))
