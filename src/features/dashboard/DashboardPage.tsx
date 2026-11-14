import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Undo2,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardAlert, DashboardSummary, LowStockItem, SalesPoint, TopProduct } from '@/types/api'
import { dashboardApi } from '@/api/dashboardApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  KpiCard,
  Skeleton,
  StockIndicator,
} from '@/components/ui/primitives'
import { DateRangePicker } from '@/components/ui/Table'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatCurrency, formatCurrencyCompact, formatNumber, formatSignedPercent } from '@/utils/format'
import { humanize, lastNDaysRange, relativeTime } from '@/utils/date'
import { useState } from 'react'

type Range = { from?: string; to?: string }

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role)
  const showProfit = can(role, 'Profit')
  const [range, setRange] = useState<Range>(lastNDaysRange(14))

  const summary = useApi<DashboardSummary>(() => dashboardApi.summary(range), [range])
  const sales = useApi<{ data: SalesPoint[] }>(() => dashboardApi.sales({ ...range, groupBy: 'DAY' }), [range])
  const top = useApi<{ data: TopProduct[] }>(() => dashboardApi.topProducts({ ...range, limit: 5 }), [range])
  const lowStock = useApi<{ data: LowStockItem[] }>(() => dashboardApi.lowStock(), [])
  const alerts = useApi<{ data: DashboardAlert[] }>(() => dashboardApi.alerts(), [])

  const summaryData = summary.data

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        description="Live snapshot of sales, fulfillment, inventory and procurement."
        actions={<DateRangePicker from={range.from} to={range.to} onChange={setRange} presets={[{ label: '7D', days: 7 }, { label: '14D', days: 14 }, { label: '30D', days: 30 }]} />}
      />

      {summary.error && <ErrorState message={summary.error} onRetry={summary.refetch} />}

      {/* KPI row */}
      <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.loading || !summaryData
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : (
            <>
              <KpiCard
                label="Net sales (period)"
                value={formatCurrencyCompact(summaryData.sales.net)}
                trend={summaryData.sales.growthPercent}
                sublabel={`Gross ${formatCurrencyCompact(summaryData.sales.gross)}`}
                icon={<TrendingUp className="h-5 w-5" aria-hidden />}
              />
              <KpiCard
                label="Orders"
                value={formatNumber(summaryData.orders.total)}
                sublabel={`${summaryData.orders.pending} pending · ${summaryData.orders.processing} processing`}
                icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
              />
              <KpiCard
                label="Fulfillment queue"
                value={formatNumber(summaryData.orders.pending + summaryData.orders.processing + summaryData.orders.packed)}
                sublabel={`${summaryData.orders.shipped} shipped · ${summaryData.orders.delivered} delivered`}
                icon={<ClipboardList className="h-5 w-5" aria-hidden />}
              />
              <KpiCard
                label="Inventory value"
                value={formatCurrencyCompact(summaryData.inventory.inventoryValue)}
                sublabel={`${summaryData.inventory.lowStockSkus} low · ${summaryData.inventory.outOfStockSkus} out of stock`}
                icon={<Boxes className="h-5 w-5" aria-hidden />}
              />
              {showProfit && (
                <KpiCard
                  label="Estimated profit"
                  value={formatCurrencyCompact(summaryData.profit.estimated)}
                  sublabel={`${summaryData.profit.marginPercent}% margin`}
                  icon={<DollarSign className="h-5 w-5" aria-hidden />}
                />
              )}
              <KpiCard
                label="Returns"
                value={formatNumber(summaryData.returns.count)}
                sublabel={`${summaryData.returns.ratePercent}% return rate`}
                icon={<Undo2 className="h-5 w-5" aria-hidden />}
              />
              <KpiCard
                label="Low-stock alerts"
                value={formatNumber(summaryData.inventory.lowStockSkus)}
                sublabel={`${formatNumber(summaryData.inventory.totalSkus)} total SKUs`}
                icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
              />
              <KpiCard
                label="Orders awaiting picking"
                value={formatNumber(summaryData.orders.pending + summaryData.orders.processing)}
                sublabel="Create pick lists to start fulfillment"
                icon={<Package className="h-5 w-5" aria-hidden />}
              />
            </>
          )}
      </section>

      {/* Charts + activity */}
      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Sales trend" subtitle="Daily net sales for the selected range" />
          <div className="h-72 px-4 py-5">
            {sales.loading ? (
              <Skeleton className="h-full w-full" />
            ) : sales.error ? (
              <ErrorState message={sales.error} onRetry={sales.refetch} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.data?.data ?? []} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#000000" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#000000" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => formatCurrencyCompact(v)} width={70} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#000000" strokeWidth={2} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Alerts" subtitle="Operational warnings and notices" />
          <ul className="divide-y divide-hairline">
            {alerts.loading && <li className="p-5"><Skeleton className="h-16 w-full" /></li>}
            {alerts.error && <ErrorState message={alerts.error} onRetry={alerts.refetch} />}
            {alerts.data?.data.length === 0 && <li className="p-6 text-center text-sm text-shade-50">No active alerts.</li>}
            {alerts.data?.data.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                <Badge tone={alert.severity === 'CRITICAL' ? 'red' : alert.severity === 'WARNING' ? 'amber' : 'slate'}>
                  {humanize(alert.severity)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{alert.message}</p>
                  <p className="mt-0.5 text-xs text-shade-40">{relativeTime(alert.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Top products + low stock */}
      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Top products"
            subtitle="Best sellers in the selected range"
            actions={<Link to="/analytics" className="text-sm font-medium underline">View analytics</Link>}
          />
          <ul className="divide-y divide-hairline">
            {top.loading && <li className="p-5"><Skeleton className="h-12 w-full" /></li>}
            {top.data?.data.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-sm font-semibold text-shade-40">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-shade-40">{p.sku} · {p.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{formatCurrency(p.revenue)}</p>
                  <p className="text-xs text-shade-40">{p.unitsSold} units</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Low stock"
            subtitle="SKUs at or below minimum stock"
            actions={<Link to="/inventory" className="text-sm font-medium underline">Open inventory</Link>}
          />
          <ul className="divide-y divide-hairline">
            {lowStock.loading && <li className="p-5"><Skeleton className="h-12 w-full" /></li>}
            {lowStock.data?.data.length === 0 && (
              <li className="p-6 text-center text-sm text-shade-50">All stock levels are healthy.</li>
            )}
            {lowStock.data?.data.slice(0, 6).map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link to={`/inventory/${item.productId}`} className="truncate text-sm font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-shade-40">{item.sku} · {item.warehouse}</p>
                </div>
                <StockIndicator available={item.availableStock} minimum={item.minimumStock} />
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <p className="mt-6 text-xs text-shade-40">
        Sales growth {formatSignedPercent(summaryData?.sales.growthPercent)} versus the previous period. Figures exclude
        cancelled orders.
      </p>
    </div>
  )
}
