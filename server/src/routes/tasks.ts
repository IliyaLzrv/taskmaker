import { Router, type Request, type Response } from 'express'
import { prisma } from '../db'
import type { AuthedRequest } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { z } from 'zod'
import type { Prisma, TaskStatus } from '@prisma/client'

export const router = Router()

// ---- Zod schemas (add these; they were missing) ----
const TaskCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedUserId: z.string().uuid().optional(),
  deadline: z.string().datetime().optional(),
})

const TaskUpdate = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
  assignedUserId: z.string().uuid().nullable().optional(), // null = unassign
  deadline: z.string().datetime().nullable().optional(),   // null = clear
})

const ParamId = z.object({ id: z.string().uuid() })
// ----------------------------------------------------

// NOTE: index.ts already mounts: app.use('/api/tasks', authMiddleware, taskRouter)
// So every handler here can assume req.auth exists. Still, keep runtime guards.

// List tasks I can see (admin: all; user: createdBy or assigned to me)
router.get('/', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const me = await prisma.user.findUnique({ where: { id: uid } })
  const isAdmin = me?.role === 'ADMIN'

  const tasks = await prisma.task.findMany({
    where: isAdmin ? {} : { OR: [{ createdById: uid }, { assignedUserId: uid }] },
    orderBy: [{ createdAt: 'desc' }],
  })
  res.json({ tasks })
})



// Create task (ADMIN only)
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const parse = TaskCreate.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  const { title, description, assignedUserId, deadline } = parse.data

  const data: Prisma.TaskCreateInput = {
    title,
    description: description ?? '',
    createdBy: { connect: { id: uid } },
    ...(deadline ? { deadline: new Date(deadline) } : {}),
    ...(assignedUserId ? { assignedUser: { connect: { id: assignedUserId } } } : {}),
  }

  const task = await prisma.task.create({ data })
  res.status(201).json({ task })
})

// Get by id (only if admin/creator/assignee)
router.get('/:id', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = ParamId.parse(req.params) // ensures a uuid string

  const me = await prisma.user.findUnique({ where: { id: uid } })
  const isAdmin = me?.role === 'ADMIN'

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return res.status(404).json({ error: 'Not found' })
  if (!isAdmin && task.createdById !== uid && task.assignedUserId !== uid) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  res.json({ task })
})

// Update: admin can update anything; assignee can only toggle status
router.patch('/:id', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = ParamId.parse(req.params)
  const me = await prisma.user.findUnique({ where: { id: uid } })
  const isAdmin = me?.role === 'ADMIN'

  const parse = TaskUpdate.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return res.status(404).json({ error: 'Not found' })

  if (isAdmin) {
    // Build update data so we don't pass undefined
    const data: Prisma.TaskUpdateInput = {}
    if (parse.data.title !== undefined) data.title = parse.data.title
    if (parse.data.description !== undefined) data.description = parse.data.description
    if (parse.data.status !== undefined) data.status = parse.data.status as TaskStatus

    if (parse.data.deadline !== undefined) {
      data.deadline = parse.data.deadline ? new Date(parse.data.deadline) : null
    }

    if (parse.data.assignedUserId !== undefined) {
      data.assignedUser = parse.data.assignedUserId === null
        ? { disconnect: true }
        : { connect: { id: parse.data.assignedUserId } }
    }

    const updated = await prisma.task.update({ where: { id }, data })
    return res.json({ task: updated })
  }

  // Non-admin: only the assignee can change status
  if (task.assignedUserId !== uid) return res.status(403).json({ error: 'Forbidden' })
  if (parse.data.status === undefined) {
    return res.status(400).json({ error: 'Only status can be updated by assignee' })
  }

  const updated = await prisma.task.update({
    where: { id },
    data: { status: parse.data.status as TaskStatus }
  })
  res.json({ task: updated })
})

// Delete task (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = ParamId.parse(req.params)
  await prisma.task.delete({ where: { id } })
  res.json({ ok: true })
})
