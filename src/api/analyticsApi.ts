import type {
  BestSeller,
  DateRange,
  DeadStockItem,
  InventoryValuation,
  ProductProfitability,
  ProfitSummary,
} from '@/types/api'
import { get, params } from './helpers'

export const analyticsApi = {
  /** Profit summary (16.1). */
  profit: (range?: DateRange) => get<ProfitSummary>('/analytics/profit', params(range)),

  productProfitability: (range?: DateRange) =>
    get<{ data: ProductProfitability[] }>('/analytics/product-profitability', params(range)),

  deadStock: (days = 60) => get<{ data: DeadStockItem[] }>('/analytics/dead-stock', { days }),

  bestSellers: (range?: DateRange) =>
    get<{ data: BestSeller[] }>('/analytics/best-sellers', params(range)),

  inventoryValuation: () => get<InventoryValuation>('/analytics/inventory-valuation'),
}
