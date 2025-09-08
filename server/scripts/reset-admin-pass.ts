import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@site.com'          // <-- your admin email
  const newPassword = 'password'      // <-- set what you want
  const hash = await bcrypt.hash(newPassword, 10)

  const updated = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash, role: 'ADMIN' },
  })
  console.log('Admin password reset for', updated.email)
}

main().catch(console.error).finally(() => prisma.$disconnect())
