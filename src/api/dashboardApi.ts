import type {
  DashboardAlert,
  DashboardSummary,
  DateRange,
  LowStockItem,
  PageQuery,
  SalesPoint,
  TopProduct,
} from '@/types/api'
import { get, params } from './helpers'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getList<T>(url: string, query?: object): Promise<{ data: T[] }> {
  const response: unknown = await get<unknown>(url, query)
  const data = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : null

  if (!data) {
    throw new Error(`Invalid response from ${url}: expected an array or an object containing a data array`)
  }

  return { data }
}

export interface SalesChartQuery extends DateRange {
  groupBy?: 'DAY' | 'WEEK' | 'MONTH'
}

export const dashboardApi = {
  summary: (range?: DateRange) =>
    get<DashboardSummary>('/dashboard/summary', params(range)),

  sales: (query: SalesChartQuery = {}) =>
    getList<SalesPoint>('/dashboard/sales', params(query)),

  topProducts: (query: DateRange & { limit?: number } = {}) =>
    getList<TopProduct>('/dashboard/top-products', params(query)),

  lowStock: () => getList<LowStockItem>('/dashboard/low-stock'),

  alerts: () => getList<DashboardAlert>('/dashboard/alerts'),
}

export type { PageQuery }
