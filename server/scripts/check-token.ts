import 'dotenv/config'
import { jwtVerify } from 'jose'

const token = process.argv[2]
if (!token) {
  console.error('Usage: ts-node scripts/check-token.ts <JWT>')
  process.exit(1)
}

const base = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const secret = process.env.SUPABASE_JWT_SECRET
const aud = process.env.SUPABASE_JWT_AUD || 'authenticated'

if (!base) throw new Error('Missing SUPABASE_URL in env')
if (!secret) throw new Error('Missing SUPABASE_JWT_SECRET in env')

const key = new TextEncoder().encode(secret)

;(async () => {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, key, {
      issuer: `${base}/auth/v1`,
      audience: aud,
      clockTolerance: '30s',
    })
    console.log('✅ VERIFIED')
    console.log('Header:', protectedHeader)
    console.log('Payload:', payload)
  } catch (err: any) {
    console.error('❌ VERIFY FAIL:', err?.message || err)
    process.exit(1)
  }
})()
