import axios, { AxiosError, AxiosHeaders } from 'axios'


let currentToken: string | null = localStorage.getItem('auth_token')

export async function syncAuthToken() {
  currentToken = localStorage.getItem('auth_token')
}

export const api = axios.create({
  baseURL:'',
  timeout: 8000,
})

api.interceptors.request.use(async (config) => {
  if (!currentToken) {
    currentToken = localStorage.getItem('auth_token')
  }
  if (currentToken) {
    if (!config.headers) config.headers = new AxiosHeaders()
    ;(config.headers as AxiosHeaders).set('Authorization', `Bearer ${currentToken}`)
  }
  if (config.data && !(config.headers as AxiosHeaders)?.has('Content-Type')) {
    (config.headers as AxiosHeaders).set('Content-Type', 'application/json')
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const hdrs = error.config?.headers
      const hadAuth =
        hdrs instanceof AxiosHeaders
          ? hdrs.has('Authorization')
          : !!(hdrs as Record<string, unknown> | undefined)?.['Authorization']

      if (hadAuth) {
        localStorage.removeItem('auth_token')
        currentToken = null
        window.dispatchEvent(new CustomEvent('app:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)
