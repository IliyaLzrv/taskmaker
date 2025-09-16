import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { signUserToken } from '../utiles/jwt' 
import { randomUUID } from 'crypto'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'

export const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, fullName } = req.body as { email: string; password: string; fullName?: string }
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' })

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(409).json({ message: 'Email already in use' })

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      fullName: fullName ?? null,
      role: 'USER',
      passwordHash: hash,
    },
    select: { id: true, email: true, role: true },
  })

  const token = await signUserToken(user) 
  res.status(201).json({ token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

  const safe = { id: user.id, email: user.email, role: user.role }
  const token = await signUserToken(safe) 
  res.json({ token })
})

router.get('/me', authMiddleware, async (req, res) => {
  const { auth } = req as AuthedRequest
  const profile = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, role: true },
  })
  res.json({ auth, profile })
})
