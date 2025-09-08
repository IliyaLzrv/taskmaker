// server/src/middleware/ensureProfile.ts
import type { Request, Response, NextFunction } from 'express'
import type { AuthedRequest } from './auth'
import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export async function ensureProfile(req: Request, res: Response, next: NextFunction) {
  const { auth } = req as AuthedRequest
  if (!auth?.userId) return res.status(401).json({ error: 'Unauthorized' })

  // Look up the user first
  const existing = await prisma.user.findUnique({ where: { id: auth.userId } })

  if (!existing) {
    // Create requires a concrete string for email; your tokens include it, but guard anyway
    const createData: Prisma.UserCreateInput = {
        id: auth.userId,
        email: auth.email ?? `${auth.userId}@placeholder.local`,
        passwordHash: ''
    }
    await prisma.user.create({ data: createData })
  } else {
    // Update only if we actually have a new email string and it changed
    if (typeof auth.email === 'string' && auth.email && auth.email !== existing.email) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { email: auth.email }, // definite string, no undefined
      })
    }
  }

  next()
}
