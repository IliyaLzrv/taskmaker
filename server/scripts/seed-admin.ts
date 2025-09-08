import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@site.com'        // <- your admin email
  const newPassword = 'ChangeMe123!'    // optional

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(newPassword, 10),
    },
    create: {
      id: crypto.randomUUID(),
      email,
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(newPassword, 10),
    },
    select: { id: true, email: true, role: true },
  })

  console.log('Admin:', user)
}
main().finally(()=>prisma.$disconnect())
