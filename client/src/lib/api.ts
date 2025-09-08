import axios, { AxiosError, AxiosHeaders } from 'axios'

// ---- in-memory token cache ----
let currentToken: string | null = localStorage.getItem('auth_token')

// expose a manual sync to use right after login/logout (optional)
export async function syncAuthToken() {
  currentToken = localStorage.getItem('auth_token')
}

export const api = axios.create({
  // If you have Vite proxy set up to 4000, keep baseURL relative to hit '/api/*'
  // Otherwise, set VITE_API_URL="http://localhost:4000/api"
  baseURL:'',
  timeout: 8000,
})

// attach token; read latest from memory or localStorage
api.interceptors.request.use(async (config) => {
  if (!currentToken) {
    currentToken = localStorage.getItem('auth_token')
  }
  if (currentToken) {
    if (!config.headers) config.headers = new AxiosHeaders()
    ;(config.headers as AxiosHeaders).set('Authorization', `Bearer ${currentToken}`)
  }
  // default JSON header if body is present and no content-type set
  if (config.data && !(config.headers as AxiosHeaders)?.has('Content-Type')) {
    (config.headers as AxiosHeaders).set('Content-Type', 'application/json')
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
        // clear local token and notify UI
        localStorage.removeItem('auth_token')
        currentToken = null
        window.dispatchEvent(new CustomEvent('app:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)
