import axios, { AxiosError, AxiosHeaders } from 'axios'
import { supabase } from './supabase'

// ---- in-memory token cache ----
let currentToken: string | null = null

// prime cache on startup
supabase.auth.getSession().then(({ data }) => {
  currentToken = data.session?.access_token ?? null
})

// keep cache in sync with auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  currentToken = session?.access_token ?? null
  window.dispatchEvent(new CustomEvent('app:auth-changed', { detail: { loggedIn: !!session } }))
})

// expose a manual sync to use right after login/logout
export async function syncAuthToken() {
  const { data } = await supabase.auth.getSession()
  currentToken = data.session?.access_token ?? null
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 8000,
})

// attach token; fallback to one-time session fetch if cache is empty
api.interceptors.request.use(async (config) => {
  if (!currentToken) {
    const { data } = await supabase.auth.getSession()
    currentToken = data.session?.access_token ?? null
  }
  if (currentToken) {
    if (!config.headers) config.headers = new AxiosHeaders()
    ;(config.headers as AxiosHeaders).set('Authorization', `Bearer ${currentToken}`)
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // only treat as "auth expired" if the request actually sent a token
      const hdrs = error.config?.headers
      const hadAuth =
        hdrs instanceof AxiosHeaders
          ? hdrs.has('Authorization')
          : !!(hdrs as Record<string, unknown> | undefined)?.['Authorization']

      if (hadAuth) {
        // token was present but rejected -> real auth problem, sign out + notify UI
        await supabase.auth.signOut().catch(() => {})
        window.dispatchEvent(new CustomEvent('app:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

