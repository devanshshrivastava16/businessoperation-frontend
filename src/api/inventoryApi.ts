import type {
  AdjustInventoryRequest,
  DateRange,
  InventoryDetail,
  InventoryItem,
  InventoryMovement,
  PageQuery,
} from '@/types/api'
import { get, getPage, params, post } from './helpers'

export interface InventoryListQuery extends PageQuery {
  search?: string
  warehouseId?: string
  binCode?: string
  lowStock?: boolean
  outOfStock?: boolean
}

export const inventoryApi = {
  list: (query: InventoryListQuery = {}) =>
    getPage<InventoryItem>('/inventory', params(query as Record<string, unknown>)),

  detail: (productId: string) => get<InventoryDetail>(`/inventory/${productId}`),

  adjust: (productId: string, body: AdjustInventoryRequest) =>
    post<AdjustInventoryRequest, void>(`/inventory/${productId}/adjust`, body),

  movements: (productId: string, query: PageQuery & DateRange = {}) =>
    getPage<InventoryMovement>(`/inventory/${productId}/movements`, params(query as Record<string, unknown>)),

  reserve: (productId: string, body: { quantity: number; orderId?: string }) =>
    post<{ quantity: number; orderId?: string }, void>(`/inventory/${productId}/reserve`, body),

  release: (productId: string, body: { quantity: number; orderId?: string }) =>
    post<{ quantity: number; orderId?: string }, void>(`/inventory/${productId}/release`, body),
}
