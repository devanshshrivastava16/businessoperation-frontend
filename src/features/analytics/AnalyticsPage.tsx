import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BestSeller, DeadStockItem, InventoryValuation, ProductProfitability, ProfitSummary } from '@/types/api'
import { analyticsApi } from '@/api/analyticsApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, ErrorState, KpiCard, Tabs } from '@/components/ui/primitives'
import { DateRangePicker } from '@/components/ui/Table'
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent } from '@/utils/format'
import { humanize, lastNDaysRange } from '@/utils/date'
import { useAuthStore } from '@/store/authStore'

const PIE_COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#c1fbd4', '#99b3ad']

type Range = { from?: string; to?: string }

export default function AnalyticsPage() {
  const role = useAuthStore((s) => s.user?.role)
  const canSeeFullProfit = role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT'
  const [tab, setTab] = useState('profit')
  const [range, setRange] = useState<Range>(lastNDaysRange(30))

  const profit = useApi<ProfitSummary>(() => analyticsApi.profit(range), [range])
  const profitability = useApi(() => analyticsApi.productProfitability(range), [range])
  const bestSellers = useApi(() => analyticsApi.bestSellers(range), [range])
  const deadStock = useApi(() => analyticsApi.deadStock(60), [])
  const valuation = useApi<InventoryValuation>(() => analyticsApi.inventoryValuation(), [])

  const costRows = profit.data
    ? [
        { name: 'Product cost', value: profit.data.productCost },
        { name: 'Shipping', value: profit.data.shippingCost },
        { name: 'Packaging', value: profit.data.packagingCost },
        { name: 'Payment fees', value: profit.data.paymentFees },
        { name: 'Discounts', value: profit.data.discounts },
        { name: 'Profit', value: profit.data.estimatedProfit },
      ]
    : []

  const profitabilityRows: ProductProfitability[] = profitability.data?.data ?? []
  const bestSellerRows: BestSeller[] = bestSellers.data?.data ?? []
  const deadStockRows: DeadStockItem[] = deadStock.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Profit, product performance, inventory value and dead stock — powered by the /analytics endpoints."
        actions={
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
            presets={[{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }]}
          />
        }
      />

      <div className="mb-4">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'profit', label: 'Profit' },
            { id: 'products', label: 'Products' },
            { id: 'inventory', label: 'Inventory value' },
          ]}
        />
      </div>

      {/* ------------------------------ Profit tab ------------------------------ */}
      {tab === 'profit' && (
        <div className="space-y-4">
          {!canSeeFullProfit && (
            <p className="rounded-lg bg-status-amber-bg px-4 py-3 text-sm text-status-amber">
              Your role has limited profit visibility — some figures are hidden.
            </p>
          )}
          {profit.error ? (
            <ErrorState message={profit.error} onRetry={profit.refetch} />
          ) : profit.data ? (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Revenue" value={formatCurrencyCompact(profit.data.revenue)} />
                <KpiCard label="Estimated profit" value={canSeeFullProfit ? formatCurrencyCompact(profit.data.estimatedProfit) : '•••'} accent />
                <KpiCard label="Profit margin" value={canSeeFullProfit ? formatPercent(profit.data.profitMarginPercent) : '•••'} />
                <KpiCard label="Discounts given" value={canSeeFullProfit ? formatCurrencyCompact(profit.data.discounts) : '•••'} />
              </section>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Cost breakdown" subtitle="Where revenue goes" />
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={costRows} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                          {costRows.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Cost structure" subtitle="Absolute values for the range" />
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costRows} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => formatCurrencyCompact(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} width={100} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }} />
                        <Bar dataKey="value" fill="#000000" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <Card className="h-40 animate-pulse" aria-hidden />
          )}
        </div>
      )}

      {/* ----------------------------- Products tab ----------------------------- */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Best sellers" subtitle="Units sold in range" />
              <div className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellerRows.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="sku" tick={{ fontSize: 10, fill: '#71717a' }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip formatter={(v, name) => [Number(v), humanize(String(name))]} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }} />
                    <Bar dataKey="unitsSold" name="Units sold" fill="#000000" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue vs cost" subtitle="Top products by revenue" />
              <div className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitabilityRows.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="sku" tick={{ fontSize: 10, fill: '#71717a' }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => formatCurrencyCompact(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#000000" strokeWidth={2} />
                    <Line type="monotone" dataKey="cost" name="Cost" stroke="#71717a" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Product profitability" subtitle="Margin by product" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline text-xs uppercase tracking-wide text-shade-40">
                    <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Units</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Revenue</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Cost</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Profit</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityRows.map((p) => (
                    <tr key={p.productId} className="border-b border-hairline/60 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-shade-40">{p.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.unitsSold}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(p.cost)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-status-green">{formatCurrency(p.profit)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatPercent(p.marginPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ---------------------------- Inventory tab ----------------------------- */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Inventory value" value={formatCurrencyCompact(valuation.data?.totalValue)} accent />
            <KpiCard label="Units on hand" value={formatNumber(valuation.data?.totalUnits)} />
            <KpiCard label="Active SKUs" value={formatNumber(valuation.data?.totalSkus)} />
          </section>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Value by category" subtitle="Stock at cost" />
              <div className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valuation.data?.byCategory ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => formatCurrencyCompact(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7' }} />
                    <Bar dataKey="value" name="Value" fill="#000000" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Dead stock" subtitle="No sales in 60+ days" />
              <ul className="divide-y divide-hairline">
                {deadStockRows.map((d) => (
                  <li key={d.productId} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-xs text-shade-40">{d.sku} · {d.stock} units · last sold {d.daysSinceLastSale}d ago</p>
                    </div>
                    <span className="tabular-nums text-status-red">{formatCurrency(d.stockValue)}</span>
                  </li>
                ))}
                {deadStockRows.length === 0 && !deadStock.loading && (
                  <li className="px-5 py-8 text-center text-sm text-shade-50">No dead stock — every SKU moved in the last 60 days.</li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
