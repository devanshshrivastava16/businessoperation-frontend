import type { ItemCondition, PageQuery, ReturnReason, ReturnRequest } from '@/types/api'
import { get, getPage, params, post } from './helpers'

export interface ReturnListQuery extends PageQuery {
  status?: ReturnRequest['status']
  search?: string
}

export const returnApi = {
  list: (query: ReturnListQuery = {}) =>
    getPage<ReturnRequest>('/returns', params(query as Record<string, unknown>)),

  get: (returnId: string) => get<ReturnRequest>(`/returns/${returnId}`),

  create: (body: { orderId: string; reason: ReturnReason; items: { orderItemId: string; quantity: number }[] }) =>
    post<{ orderId: string; reason: ReturnReason; items: { orderItemId: string; quantity: number }[] }, ReturnRequest>(
      '/returns',
      body,
    ),

  approve: (returnId: string) => post<void, void>(`/returns/${returnId}/approve`),

  reject: (returnId: string, reason?: string) =>
    post<{ reason?: string }, void>(`/returns/${returnId}/reject`, { reason }),

  inspect: (returnId: string, body: { condition: ItemCondition; restockable: boolean; notes?: string }) =>
    post<{ condition: ItemCondition; restockable: boolean; notes?: string }, void>(`/returns/${returnId}/inspect`, body),

  /** Resolution: REFUND with amount, or REPLACEMENT (14.5). */
  resolve: (returnId: string, body: { resolution: 'REFUND' | 'REPLACEMENT'; amount?: number }) =>
    post<{ resolution: 'REFUND' | 'REPLACEMENT'; amount?: number }, void>(`/returns/${returnId}/resolve`, body),
}
