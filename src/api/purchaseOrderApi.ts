import type {
  CreatePurchaseOrderRequest,
  PageQuery,
  PurchaseOrder,
  PurchaseOrderStatus,
  ReceivePurchaseOrderRequest,
} from '@/types/api'
import { get, getPage, params, post } from './helpers'

export interface PurchaseOrderListQuery extends PageQuery {
  status?: PurchaseOrderStatus
  supplierId?: string
  search?: string
}

export const purchaseOrderApi = {
  list: (query: PurchaseOrderListQuery = {}) =>
    getPage<PurchaseOrder>('/purchase-orders', params(query as Record<string, unknown>)),

  get: (purchaseOrderId: string) => get<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}`),

  create: (body: CreatePurchaseOrderRequest) =>
    post<CreatePurchaseOrderRequest, PurchaseOrder>('/purchase-orders', body),

  /** Submit for approval when created as DRAFT. */
  submit: (purchaseOrderId: string) => post<void, void>(`/purchase-orders/${purchaseOrderId}/submit`),

  approve: (purchaseOrderId: string) => post<void, void>(`/purchase-orders/${purchaseOrderId}/approve`),

  cancel: (purchaseOrderId: string) => post<void, void>(`/purchase-orders/${purchaseOrderId}/cancel`),

  /** Supports partial receiving (damaged units never become sellable — section 26). */
  receive: (purchaseOrderId: string, body: ReceivePurchaseOrderRequest) =>
    post<ReceivePurchaseOrderRequest, void>(`/purchase-orders/${purchaseOrderId}/receive`, body),
}
