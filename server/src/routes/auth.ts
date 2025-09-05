import { Router } from 'express'
import { authMiddleware, AuthedRequest } from '../middleware/auth'
import { prisma } from '../db'

export const router = Router()

router.get('/me', authMiddleware, (req, res) => {
  // show normalized info; also include raw payload if you like
  res.json({ auth: req.auth })
})

// Example: upsert user based on JWT (optional)
router.post('/sync', authMiddleware, async (req, res) => {
  const { auth } = req as AuthedRequest
  const { userId, email } = auth

  if (!email) return res.status(400).json({ error: 'JWT missing email' })

  const upserted = await prisma.user.upsert({
    where: { id: userId },
    update: { email },
    create: { id: userId, email },
  })

  res.json({ user: upserted })
})
