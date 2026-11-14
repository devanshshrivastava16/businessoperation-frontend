import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, TrendingUp } from 'lucide-react'
import type { Customer, CustomerAnalytics, OrderSummary } from '@/types/api'
import { customerApi } from '@/api/customerApi'
import { orderApi } from '@/api/orderApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/Table'
import { Card, CardHeader, ErrorState, KpiCard, NotFoundState, PageLoader, StatusBadge, Tag } from '@/components/ui/primitives'
import { formatCurrency, formatNumber } from '@/utils/format'
import { formatDate, orderStatusTone } from '@/utils/date'
import { useAuthStore } from '@/store/authStore'

const orderColumns: Column<OrderSummary>[] = [
  { key: 'orderNumber', header: 'Order', render: (o) => (
    <Link to={`/orders/${o.id}`} className="font-medium underline" onClick={(e) => e.stopPropagation()}>
      {o.orderNumber}
    </Link>
  ) },
  { key: 'createdAt', header: 'Date', render: (o) => formatDate(o.createdAt) },
  { key: 'itemCount', header: 'Items', className: 'text-right', render: (o) => <span className="tabular-nums">{o.itemCount}</span> },
  { key: 'total', header: 'Total', className: 'text-right', render: (o) => <span className="font-medium tabular-nums">{formatCurrency(o.total)}</span> },
  { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} tone={orderStatusTone(o.status)} /> },
]

export default function CustomerDetailPage() {
  const { customerId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const limited = role === 'WAREHOUSE_STAFF'
  const [page, setPage] = useState(0)

  const customer = useApi<Customer>(() => customerApi.get(customerId), [customerId])
  const analytics = useApi<CustomerAnalytics>(() => customerApi.analytics(customerId), [customerId])
  const orders = useApi(() => orderApi.list({ size: 8 }), [])
  const customerOrders = useApi(() => customerApi.orders(customerId, { page, size: 8 }), [customerId, page])

  if (customer.loading) return <PageLoader />
  if (customer.errorStatus === 404) return <NotFoundState />
  if (customer.error) return <ErrorState message={customer.error} onRetry={customer.refetch} />
  const c = customer.data
  if (!c) return null

  return (
    <div>
      <PageHeader
        title={c.name}
        description={`${c.email}${c.phone ? ` · ${c.phone}` : ''} · customer since ${formatDate(c.createdAt)}`}
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: c.name }]}
        actions={
          <>
            <Link to="/customers" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Link>
            <Tag tone="mint">{c.segment}</Tag>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total orders" value={formatNumber(analytics.data?.totalOrders ?? c.totalOrders)} icon={<TrendingUp className="h-5 w-5" aria-hidden />} />
        {!limited && <KpiCard label="Lifetime spend" value={formatCurrency(analytics.data?.totalSpent ?? c.totalSpent)} />}
        {!limited && <KpiCard label="Average order value" value={formatCurrency(analytics.data?.averageOrderValue)} />}
        <KpiCard label="Last purchase" value={analytics.data?.lastPurchase ? formatDate(analytics.data.lastPurchase) : '—'} />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Order history" subtitle="All orders from this customer" />
          <DataTable
            columns={orderColumns}
            rows={customerOrders.data?.content ?? orders.data?.content ?? []}
            rowKey={(o) => o.id}
            loading={customerOrders.loading}
            error={customerOrders.error}
            onRetry={customerOrders.refetch}
            emptyTitle="No orders yet"
          />
          <Pagination
            page={customerOrders.data?.page ?? 0}
            totalPages={customerOrders.data?.totalPages ?? 1}
            totalElements={customerOrders.data?.totalElements ?? 0}
            size={customerOrders.data?.size ?? 8}
            onPageChange={setPage}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact" actions={<Mail className="h-4 w-4 text-shade-40" aria-hidden />} />
            <div className="space-y-2 p-5 text-sm">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-shade-40" aria-hidden /> {c.email}</p>
              {c.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-shade-40" aria-hidden /> {c.phone}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Addresses" />
            <ul className="divide-y divide-hairline">
              {c.addresses.map((a, i) => (
                <li key={i} className="px-5 py-3.5 text-xs leading-relaxed text-shade-60">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                  {a.city}, {a.state} {a.postalCode}<br />
                  {a.country}
                </li>
              ))}
              {c.addresses.length === 0 && <li className="px-5 py-4 text-sm text-shade-50">No addresses on file.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
