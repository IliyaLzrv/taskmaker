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
  description: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
  assignedUserId: z.string().uuid().nullable().optional(), // still supported
  assigneeEmail: z.string().email().nullable().optional(),  // NEW: admin can set by email
  deadline: z.string().datetime().nullable().optional(),
})

const TaskSelect = {
  id: true, title: true, description: true, status: true,
  createdAt: true, deadline: true, assignedUserId: true, createdById: true
} as const


const ParamId = z.object({ id: z.string().uuid() })

// List tasks I can see (admin: all; user: createdBy or assigned to me)
router.get('/', async (req, res) => {
  const { auth } = req as AuthedRequest
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { createdById: auth.userId },
        { assignedUserId: auth.userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      deadline: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      assignedUserId: true, // <-- IMPORTANT for client-side filtering
      assignedUser: { select: { id: true, email: true } },
      createdBy:   { select: { id: true, email: true } },
    },
  })
  res.json(tasks)
})



// Create task (ADMIN only)
router.post('/', async (req, res) => {
  const { auth } = req as AuthedRequest
  if (!auth?.userId) return res.status(401).json({ message: 'Not authenticated' })

  const { title, description, deadline, assigneeEmail } = req.body as {
    title?: string
    description?: string | null
    deadline?: string | null
    assigneeEmail?: string | null
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' })
  }

  let deadlineDate: Date | null = null
  if (deadline) {
    const d = new Date(deadline)
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Invalid deadline' })
    }
    deadlineDate = d
  }

  // Only ADMINs can assign at creation time
  let assignedUserId: string | null = null
  if (assigneeEmail && auth.role === 'ADMIN') {
    const assignee = await prisma.user.findUnique({ where: { email: assigneeEmail } })
    if (!assignee) return res.status(404).json({ message: 'Assignee not found' })
    assignedUserId = assignee.id
  } else if (assigneeEmail && auth.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can assign tasks' })
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: (description ?? '')?.trim() || null,
      deadline: deadlineDate,
      createdById: auth.userId,        // REQUIRED by your schema
      assignedUserId,                  // null unless admin assigned
    },
  })

  return res.status(201).json(task)
})

// BROWSE all PENDING tasks (any authenticated user)
router.get('/browse', async (_req, res) => {
  const tasks = await prisma.task.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedUser: { select: { id: true, email: true } },
      createdBy:    { select: { id: true, email: true } },
    },
  })
  res.json(tasks)
})

// Get by id (only if admin/creator/assignee)
// replace your GET /:id with this version
router.get('/:id', async (req, res) => {
  const { auth } = req as AuthedRequest

  const where =
    auth.role === 'ADMIN'
      ? { id: req.params.id }
      : {
          id: req.params.id,
          OR: [{ createdById: auth.userId }, { assignedUserId: auth.userId }],
        }

  const task = await prisma.task.findFirst({
    where,
    include: {
      assignedUser: { select: { id: true, email: true } },
      createdBy:    { select: { id: true, email: true } },
    },
  })
  if (!task) return res.status(404).json({ message: 'Not found' })
  res.json(task)
})


router.patch('/:id', async (req: Request, res: Response) => {
  const { auth } = req as AuthedRequest
  const uid = auth?.userId
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = ParamId.parse(req.params)

  const parse = TaskUpdate.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return res.status(404).json({ error: 'Not found' })

  const me = await prisma.user.findUnique({ where: { id: uid } })
  const isAdmin = me?.role === 'ADMIN'

  if (isAdmin) {
    // Build update data only from provided fields
    const data: Prisma.TaskUpdateInput = {}

    if (parse.data.title !== undefined) data.title = parse.data.title
    if (parse.data.description !== undefined) data.description = parse.data.description
    if (parse.data.status !== undefined) data.status = parse.data.status as TaskStatus
    if (parse.data.deadline !== undefined) {
      data.deadline = parse.data.deadline ? new Date(parse.data.deadline) : null
    }

    // Assignment priority: assigneeEmail (if provided) > assignedUserId (if provided)
    if (parse.data.assigneeEmail !== undefined) {
      if (parse.data.assigneeEmail === null || parse.data.assigneeEmail.trim() === '') {
        data.assignedUser = { disconnect: true }
      } else {
        const u = await prisma.user.findUnique({ where: { email: parse.data.assigneeEmail } })
        if (!u) return res.status(404).json({ error: 'Assignee not found' })
        data.assignedUser = { connect: { id: u.id } }
      }
    } else if (parse.data.assignedUserId !== undefined) {
      data.assignedUser = parse.data.assignedUserId === null
        ? { disconnect: true }
        : { connect: { id: parse.data.assignedUserId } }
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: { id: true, email: true } },
        createdBy:    { select: { id: true, email: true } },
      },
    })
    return res.json({ task: updated })
  }

  // Non-admin: only the current assignee can change status
  if (task.assignedUserId !== uid) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (parse.data.status === undefined) {
    return res.status(400).json({ error: 'Only status can be updated by assignee' })
  }

  const updated = await prisma.task.update({
    where: { id },
    data: { status: parse.data.status as TaskStatus },
  })
  res.json({ task: updated })
})


// Delete task (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = ParamId.parse(req.params)
  await prisma.task.delete({ where: { id } })
  res.json({ ok: true })
})

// REQUEST a task (user asks to be assigned)
router.post('/:id/requests', async (req, res) => {
  const { auth } = req as AuthedRequest
  const { id } = req.params

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return res.status(404).json({ message: 'Task not found' })
  if (task.assignedUserId) return res.status(409).json({ message: 'Task already assigned' })

  try {
    const reqRow = await prisma.taskRequest.create({
      data: { taskId: id, requesterId: auth.userId },
      select: { id: true, status: true, createdAt: true },
    })
    return res.status(201).json(reqRow)
  } catch (e: any) {
    // unique constraint on (taskId, requesterId, status) blocks duplicates
    return res.status(409).json({ message: 'You already requested this task' })
  }
})

