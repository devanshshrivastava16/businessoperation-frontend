import type { PageQuery, Supplier } from '@/types/api'
import { del, get, getPage, params, post, put } from './helpers'

export interface SupplierListQuery extends PageQuery {
  search?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export type SupplierPayload = Omit<Supplier, 'id'>

export const supplierApi = {
  list: (query: SupplierListQuery = {}) =>
    getPage<Supplier>('/suppliers', params(query as Record<string, unknown>)),

  get: (supplierId: string) => get<Supplier>(`/suppliers/${supplierId}`),

  create: (body: SupplierPayload) => post<SupplierPayload, Supplier>('/suppliers', body),

  update: (supplierId: string, body: Partial<SupplierPayload>) =>
    put<Partial<SupplierPayload>, Supplier>(`/suppliers/${supplierId}`, body),

  remove: (supplierId: string) => del<void>(`/suppliers/${supplierId}`),
}
