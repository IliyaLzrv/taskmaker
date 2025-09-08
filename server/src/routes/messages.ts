import { Router, type Request, type Response } from 'express'
import { prisma } from '../db'
import type { AuthedRequest } from '../middleware/auth'
import { z } from 'zod'

export const router = Router({ mergeParams: true })

const CreateMessage = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
})

const ParamId = z.object({ id: z.string().uuid() }) // <-- validate :id

// permission check: admin OR creator OR assignee
async function canAccessTask(taskId: string, uid: string) {
  const [me, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: uid }, select: { role: true } }),
    prisma.task.findUnique({ where: { id: taskId }, select: { createdById: true, assignedUserId: true } })
  ])
  if (!task) return { ok: false, status: 404 as const }
  const isAdmin = me?.role === 'ADMIN'
  const isCreator = task.createdById === uid
  const isAssignee = task.assignedUserId === uid
  return { ok: isAdmin || isCreator || isAssignee, status: 200 as const }
}

// GET /api/tasks/:id/messages
router.get('/', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id: taskId } = ParamId.parse(req.params) // <-- string
  const access = await canAccessTask(taskId, uid)
  if (!access.ok) return res.status(access.status).json({ error: access.status === 404 ? 'Not found' : 'Forbidden' })

  const messages = await prisma.taskMessage.findMany({
    where: { taskId }, // <-- string, not undefined
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, body: true, createdAt: true,
      author: { select: { id: true, email: true } },
    },
  })
  res.json({ messages })
})

// POST /api/tasks/:id/messages
router.post('/', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id: taskId } = ParamId.parse(req.params) // <-- string
  const access = await canAccessTask(taskId, uid)
  if (!access.ok) return res.status(access.status).json({ error: access.status === 404 ? 'Not found' : 'Forbidden' })

  const parse = CreateMessage.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const msg = await prisma.taskMessage.create({
    data: { taskId, authorId: uid, body: parse.data.body }, // <-- all strings
    select: {
      id: true, body: true, createdAt: true,
      author: { select: { id: true, email: true } },
    },
  })
  res.status(201).json({ message: msg })
})
