import type { Request, Response, NextFunction } from 'express'
import { jwtVerify, type JWTPayload } from 'jose'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET
const SUPABASE_JWT_AUD = process.env.SUPABASE_JWT_AUD || 'authenticated'

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in env')
if (!SUPABASE_JWT_SECRET) throw new Error('Missing SUPABASE_JWT_SECRET in env')

// HS256 verification key
const key = new TextEncoder().encode(SUPABASE_JWT_SECRET)

// Augment Express: add a typed auth object
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
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }
  const token = header.slice('Bearer '.length).trim()

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: SUPABASE_JWT_AUD,
      clockTolerance: '30s',
    })

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined
    if (!userId) return res.status(401).json({ error: 'JWT missing sub' })

    const email = typeof (payload as any).email === 'string' ? (payload as any).email : undefined
    const role = typeof (payload as any).role === 'string' ? (payload as any).role : undefined

    req.auth = { userId, email, role, raw: payload }
    next()
  } catch (err) {
    console.error('JWT verification failed:', err)
    return res.status(401).json({ error: 'Invalid token' })
  }
}
