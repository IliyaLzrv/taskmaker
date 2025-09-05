import type { Request, Response, NextFunction } from 'express'
import type { AuthedRequest } from './auth'
import { prisma } from '../db'

export function requireRole(role: 'ADMIN' | 'USER') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { auth } = req as AuthedRequest
    const uid = auth?.userId
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })

    const user = await prisma.user.findUnique({ where: { id: uid } })
    if (!user) return res.status(403).json({ error: 'Profile not found' })
    if (role === 'ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    ;(req as any).profile = user
    next()
  }
}
