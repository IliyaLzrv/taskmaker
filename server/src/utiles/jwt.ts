import { SignJWT } from 'jose'
const key = new TextEncoder().encode(process.env.JWT_SECRET!)

type Role = 'ADMIN' | 'USER'
export async function signUserToken(user: { id: string; email: string; role: Role }) {
  return await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setExpirationTime('7d')
    .sign(key)                     
}
