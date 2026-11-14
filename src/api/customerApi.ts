import type { Customer, CustomerAnalytics, OrderSummary, PageQuery } from '@/types/api'
import { get, getPage, params } from './helpers'

export interface CustomerListQuery extends PageQuery {
  search?: string
  segment?: Customer['segment']
}

export const customerApi = {
  list: (query: CustomerListQuery = {}) =>
    getPage<Customer>('/customers', params(query as Record<string, unknown>)),

  get: (customerId: string) => get<Customer>(`/customers/${customerId}`),

  orders: (customerId: string, query: PageQuery = {}) =>
    getPage<OrderSummary>(`/customers/${customerId}/orders`, params(query)),

  analytics: (customerId: string) => get<CustomerAnalytics>(`/customers/${customerId}/analytics`),
}
