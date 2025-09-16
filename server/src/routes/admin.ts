import { Router, type Request, type Response } from 'express'
import { prisma } from '../db'
import { requireRole } from '../middleware/roles'
import { z } from 'zod'

export const router = Router()

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)     
})

const PatchUserRole = z.object({ role: z.enum(['ADMIN', 'USER']) })
const ParamId = z.object({ id: z.string().uuid() }) 

router.patch('/users/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = ParamId.parse(req.params) 
  const parse = PatchUserRole.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parse.data.role },
    select: { id: true, email: true, role: true },
  })

  res.json({ user: updated })
})

router.get('/tasks', async (_req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignedUser: { select: { id: true, email: true } },
      createdBy:    { select: { id: true, email: true } },
    },
  })
  res.json(tasks)
})


router.get('/requests', async (_req, res) => {
  const reqs = await prisma.taskRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      task: { select: { id: true, title: true } },
      requester: { select: { id: true, email: true } },
    },
  })
  res.json(reqs)
})


router.patch('/requests/:id', async (req, res) => {
  const { id } = req.params
  const { action } = req.body as { action: 'APPROVE' | 'DENY' }

  const tr = await prisma.taskRequest.findUnique({
    where: { id },
    include: { task: true, requester: true },
  })
  if (!tr) return res.status(404).json({ message: 'Request not found' })
  if (tr.status !== 'PENDING') return res.status(409).json({ message: 'Request already processed' })

  if (action === 'DENY') {
    const upd = await prisma.taskRequest.update({ where: { id }, data: { status: 'DENIED' } })
    return res.json(upd)
  }

  
  if (tr.task.assignedUserId && tr.task.assignedUserId !== tr.requesterId) {
    return res.status(409).json({ message: 'Task already assigned' })
  }

  const result = await prisma.$transaction([
    prisma.task.update({
      where: { id: tr.taskId },
      data: { assignedUserId: tr.requesterId },
    }),
    prisma.taskRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    }),
    
    prisma.taskRequest.updateMany({
      where: { taskId: tr.taskId, status: 'PENDING', NOT: { id } },
      data: { status: 'DENIED' },
    }),
  ])

  res.json({ ok: true, applied: result.length })
})
