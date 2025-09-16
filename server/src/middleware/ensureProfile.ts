import type { Request, Response, NextFunction } from 'express'
import type { AuthedRequest } from './auth'
import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export async function ensureProfile(req: Request, res: Response, next: NextFunction) {
  const { auth } = req as AuthedRequest
  if (!auth?.userId) return res.status(401).json({ error: 'Unauthorized' })

  const existing = await prisma.user.findUnique({ where: { id: auth.userId } })

  if (!existing) {
    const createData: Prisma.UserCreateInput = {
        id: auth.userId,
        email: auth.email ?? `${auth.userId}@placeholder.local`,
        passwordHash: ''
    }
    await prisma.user.create({ data: createData })
  } else {
    if (typeof auth.email === 'string' && auth.email && auth.email !== existing.email) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { email: auth.email }, 
      })
    }
  }

  next()
}
