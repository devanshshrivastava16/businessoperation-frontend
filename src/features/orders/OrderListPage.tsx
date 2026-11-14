import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import type { OrderStatus, OrderSummary } from '@/types/api'
import { orderApi } from '@/api/orderApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, DateRangePicker, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Card, Select, StatusBadge } from '@/components/ui/primitives'
import { formatCurrency } from '@/utils/format'
import { humanize, orderStatusTone, relativeTime } from '@/utils/date'
import { useState } from 'react'

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PICKING', 'PICKED', 'PACKING', 'PACKED',
  'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED',
]

export default function OrderListPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const list = usePagedList<OrderSummary>((query) =>
    orderApi.list({ ...query, from: range.from, to: range.to } as never),
  )

  const columns: Column<OrderSummary>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: true,
      render: (o) => (
        <div>
          <p className="font-medium text-ink">{o.orderNumber}</p>
          <p className="text-xs text-shade-40">{relativeTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.customerName}</p>
          <p className="truncate text-xs text-shade-40">{o.customerEmail}</p>
        </div>
      ),
    },
    { key: 'channel', header: 'Channel', render: () => <span className="text-xs text-shade-50">Shopify</span> },
    { key: 'itemCount', header: 'Items', className: 'text-right', render: (o) => <span className="tabular-nums">{o.itemCount}</span> },
    { key: 'total', header: 'Total', sortable: true, className: 'text-right', render: (o) => <span className="font-medium tabular-nums">{formatCurrency(o.total)}</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} tone={orderStatusTone(o.status)} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Shopify orders with live fulfillment status. Click an order for items, payment and history."
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search order number or customer…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by status"
            value={(list.filters.status as string) ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-48"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={(r) => { setRange(r) }}
            presets={[{ label: '7D', days: 7 }, { label: '14D', days: 14 }, { label: '30D', days: 30 }]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(o) => o.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No orders found"
          emptyDescription="Try changing the search, status filter or date range."
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          sort={list.sort}
          onSortChange={list.setSort}
        />
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          totalElements={list.totalElements}
          size={list.size}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </Card>
      <p className="mt-4 flex items-center gap-2 text-xs text-shade-40">
        <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} orders in range
      </p>
    </div>
  )
}
