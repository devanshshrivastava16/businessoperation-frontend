import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiErrorBody } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: { field: string; message: string }[]
  readonly traceId?: string

  constructor(status: number, code: string, message: string, fieldErrors: { field: string; message: string }[] = [], traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.traceId = traceId
  }

  get isAuthError(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code === 'INVALID_STATE_TRANSITION' || this.code === 'INSUFFICIENT_STOCK'
  }
}

/** Convert any thrown value into an ApiError (network failures included). */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined
    if (body && typeof body.status === 'number' && body.message) {
      return new ApiError(body.status, body.code ?? 'INTERNAL_ERROR', body.message, body.errors ?? [], body.traceId)
    }
    if (err.response) {
      return new ApiError(err.response.status, 'INTERNAL_ERROR', err.response.statusText || 'Request failed')
    }
    return new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.')
  }
  return new ApiError(0, 'UNKNOWN', err instanceof Error ? err.message : 'Unexpected error')
}

/** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
let refreshPromise: Promise<string> | null = null

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ------------------------- Request interceptor ------------------------- */

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem('bo-auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } }
      const token = parsed.state?.accessToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // corrupted storage — proceed unauthenticated
    }
  }
  return config
})

/* ------------------------- Response interceptor ------------------------ */

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status

    if (status === 401 && original && !original._retried && !original.url?.includes('/auth/login')) {
      const raw = localStorage.getItem('bo-auth')
      const refreshToken = raw ? (JSON.parse(raw) as { state?: { refreshToken?: string | null } }).state?.refreshToken : undefined

      if (refreshToken) {
        try {
          refreshPromise =
            refreshPromise ??
            axios
              .post<{ accessToken: string; refreshToken: string }>(
                `${baseURL}/auth/refresh`,
                { refreshToken },
                { headers: { 'Content-Type': 'application/json' } },
              )
              .then((res) => {
                const tokens = res.data
                const stored = localStorage.getItem('bo-auth')
                if (stored) {
                  const state = JSON.parse(stored) as { state?: Record<string, unknown> }
                  state.state = { ...state.state, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
                  localStorage.setItem('bo-auth', JSON.stringify(state))
                }
                window.dispatchEvent(new CustomEvent('bo:tokens-refreshed', { detail: tokens }))
                return tokens.accessToken
              })
              .finally(() => {
                refreshPromise = null
              })

          const newToken = await refreshPromise
          original._retried = true
          original.headers.Authorization = `Bearer ${newToken}`
          return apiClient.request(original)
        } catch {
          // refresh failed — fall through to session invalidation
        }
      }

      // Session is invalid: clear and let the router guard redirect to /login
      localStorage.removeItem('bo-auth')
      window.dispatchEvent(new CustomEvent('bo:session-expired'))
    }

    return Promise.reject(toApiError(error))
  },
)

/**
 * Attach the isolated mock adapter when VITE_USE_MOCKS=true.
 * The mock layer is imported dynamically so it is excluded from production
 * bundles when mocks are disabled.
 */
export async function enableMocksIfConfigured(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { installMockAdapter } = await import('@/mocks/mockAdapter')
    installMockAdapter(apiClient)
  }
}
