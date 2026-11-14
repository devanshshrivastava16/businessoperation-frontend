import type { ShopifyIntegration, SyncLog, SyncResult } from '@/types/api'
import { get, post } from './helpers'

/**
 * Shopify integration API. The app never reads or displays Shopify access
 * tokens — the backend holds them server-side (security rule).
 */
export const shopifyApi = {
  status: () => get<ShopifyIntegration>('/integrations/shopify'),

  connect: () => post<void, SyncResult>('/integrations/shopify/connect'),

  syncProducts: () => post<void, SyncResult>('/integrations/shopify/sync/products'),
  syncOrders: () => post<void, SyncResult>('/integrations/shopify/sync/orders'),
  syncInventory: () => post<void, SyncResult>('/integrations/shopify/sync/inventory'),
  syncCustomers: () => post<void, SyncResult>('/integrations/shopify/sync/customers'),
  syncFull: () => post<void, SyncResult>('/integrations/shopify/sync/full'),

  /** Recent sync activity + failures (derived from backend sync event log). */
  syncLogs: () => get<{ data: SyncLog[] }>('/integrations/shopify/sync/logs'),
}
