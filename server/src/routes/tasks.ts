import { Router } from 'express'
import { prisma } from '../db'

export const router = Router()

// list tasks (for now: all tasks)
router.get('/', async (_req, res) => {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ tasks })
})

// quick create (no auth yet, just to test DB)
router.post('/', async (req, res) => {
  const { title, description } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  const task = await prisma.task.create({
    data: {
      title,
      description: description || '',
      // TEMP creator: random UUID; we'll use real user id after auth
      createdById: '00000000-0000-0000-0000-000000000000'
    }
  })
  res.status(201).json({ task })
})
