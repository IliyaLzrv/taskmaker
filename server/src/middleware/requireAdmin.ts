import type { Request, Response, NextFunction } from 'express'

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).auth?.role
  if (role === 'ADMIN') return next()
  return res.status(403).json({ message: 'Admins only' })
}
