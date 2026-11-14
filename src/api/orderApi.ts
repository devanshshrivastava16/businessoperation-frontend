import type { Order, OrderStatus, OrderStatusHistoryEntry, PageQuery, OrderSummary, UpdateOrderStatusRequest } from '@/types/api'
import { get, getPage, params, patch } from './helpers'

export interface OrderListQuery extends PageQuery {
  status?: OrderStatus
  search?: string
  from?: string
  to?: string
}

export const orderApi = {
  list: (query: OrderListQuery = {}) =>
    getPage<OrderSummary>('/orders', params(query as Record<string, unknown>)),

  get: (orderId: string) => get<Order>(`/orders/${orderId}`),

  /** State transitions validated by the backend (INVALID_STATE_TRANSITION otherwise). */
  updateStatus: (orderId: string, body: UpdateOrderStatusRequest) =>
    patch<UpdateOrderStatusRequest, void>(`/orders/${orderId}/status`, body),

  cancel: (orderId: string, reason?: string) =>
    patch<{ status: OrderStatus; reason?: string }, void>(`/orders/${orderId}/status`, {
      status: 'CANCELLED',
      reason,
    }),

  statusHistory: (orderId: string) =>
    get<{ data: OrderStatusHistoryEntry[] }>(`/orders/${orderId}/status-history`),
}
