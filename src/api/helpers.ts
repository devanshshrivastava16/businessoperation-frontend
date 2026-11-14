import type { AxiosResponse } from 'axios'
import type { PageQuery } from '@/types/api'
import { apiClient } from './axiosInstance'

/** Build a query param object, dropping undefined/null/'' values. */
export function params(...sources: (object | undefined)[]): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const src of sources) {
    if (!src) continue
    for (const [key, value] of Object.entries(src)) {
      if (value === undefined || value === null || value === '') continue
      out[key] = value as string | number | boolean
    }
  }
  return out
}

/** Typed GET helper returning response data. */
export async function get<T>(url: string, query?: object): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.get<T>(url, { params: query as Record<string, unknown> | undefined })
  return res.data
}

/** Typed GET helper for paginated endpoints. */
export async function getPage<T>(url: string, query: PageQuery & object): Promise<import('@/types/api').Page<T>> {
  return get<import('@/types/api').Page<T>>(url, params(query))
}

/** Typed POST helper. */
export async function post<TRequest, TResponse = void>(url: string, body?: TRequest): Promise<TResponse> {
  const res = await apiClient.post<TResponse>(url, body)
  return res.data
}

/** Typed PUT helper. */
export async function put<TRequest, TResponse = void>(url: string, body?: TRequest): Promise<TResponse> {
  const res = await apiClient.put<TResponse>(url, body)
  return res.data
}

/** Typed PATCH helper. */
export async function patch<TRequest, TResponse = void>(url: string, body?: TRequest): Promise<TResponse> {
  const res = await apiClient.patch<TResponse>(url, body)
  return res.data
}

/** Typed DELETE helper. */
export async function del<T = void>(url: string): Promise<T> {
  const res = await apiClient.delete<T>(url)
  return res.data
}
