import type { Request, Response, NextFunction } from 'express'
import { jwtVerify, type JWTPayload } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET
const SUPABASE_JWT_AUD = process.env.SUPABASE_JWT_AUD || 'authenticated'

if (!JWT_SECRET) throw new Error('Missing JWT_SECRET in env')

const appKey = new TextEncoder().encode(JWT_SECRET)
const supaKey = SUPABASE_JWT_SECRET ? new TextEncoder().encode(SUPABASE_JWT_SECRET) : undefined

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      userId: string
      email?: string
      role?: 'ADMIN' | 'USER' | string
      raw?: JWTPayload
    }
  }
}
export type AuthedRequest = Request & {
  auth: { userId: string; email?: string; role?: 'ADMIN' | 'USER' | string; raw?: JWTPayload }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing bearer token' })
  const token = header.slice('Bearer '.length).trim()

  try {
    const { payload } = await jwtVerify(token, appKey, { algorithms: ['HS256'] })
    const userId = typeof payload.sub === 'string' ? payload.sub : undefined
    if (!userId) throw new Error('missing sub')
    const email = typeof (payload as any).email === 'string' ? (payload as any).email : undefined
    const role = typeof (payload as any).role === 'string' ? (payload as any).role : undefined
    req.auth = { userId, email, role, raw: payload }
    return next()
  } catch {

  }

  if (supaKey && SUPABASE_URL) {
    try {
      const { payload } = await jwtVerify(token, supaKey, {
        issuer: `${SUPABASE_URL}/auth/v1`,
        audience: SUPABASE_JWT_AUD,
        clockTolerance: '30s',
        algorithms: ['HS256'],
      })
      const userId = typeof payload.sub === 'string' ? payload.sub : undefined
      if (!userId) throw new Error('missing sub')
      const email = typeof (payload as any).email === 'string' ? (payload as any).email : undefined
      const role = typeof (payload as any).role === 'string' ? (payload as any).role : undefined
      req.auth = { userId, email, role, raw: payload }
      return next()
    } catch {
      /* ignore */
    }
  }

  return res.status(401).json({ error: 'Invalid token' })
}
