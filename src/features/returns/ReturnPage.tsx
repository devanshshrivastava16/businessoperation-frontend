import { useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { ReturnRequest, ReturnStatus } from '@/types/api'
import { returnApi } from '@/api/returnApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Card, Select, StatusBadge } from '@/components/ui/primitives'
import { formatCurrency } from '@/utils/format'
import { humanize, relativeTime } from '@/utils/date'
import type { BadgeTone } from '@/utils/date'
import { useAuthStore } from '@/store/authStore'

const STATUSES: ReturnStatus[] = ['REQUESTED', 'APPROVED', 'REJECTED', 'INSPECTED', 'RESOLVED']

export function returnStatusTone(status: ReturnStatus): BadgeTone {
  switch (status) {
    case 'REQUESTED':
      return 'amber'
    case 'APPROVED':
      return 'aloe'
    case 'INSPECTED':
      return 'slate'
    case 'RESOLVED':
      return 'green'
    case 'REJECTED':
      return 'red'
    default:
      return 'slate'
  }
}

export default function ReturnPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const list = usePagedList<ReturnRequest>((query) => returnApi.list(query as never))

  const columns: Column<ReturnRequest>[] = [
    {
      key: 'returnNumber',
      header: 'Return',
      render: (r) => (
        <div>
          <p className="font-medium text-ink">{r.returnNumber}</p>
          <p className="text-xs text-shade-40">{relativeTime(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order',
      render: (r) => (
        <button type="button" className="underline" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${r.orderId}`) }}>
          {r.orderNumber}
        </button>
      ),
    },
    { key: 'customerName', header: 'Customer', render: (r) => r.customerName },
    { key: 'reason', header: 'Reason', render: (r) => humanize(r.reason) },
    { key: 'items', header: 'Items', className: 'text-right', render: (r) => <span className="tabular-nums">{r.items.length}</span> },
    { key: 'refundAmount', header: 'Refund', className: 'text-right', render: (r) => <span className="tabular-nums">{formatCurrency(r.refundAmount)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} tone={returnStatusTone(r.status)} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Review return requests, approve or reject, inspect condition, and resolve with refund or replacement."
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search return, order or customer…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by status"
            value={(list.filters.status as string) ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-44"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No returns"
          emptyDescription={role === 'WAREHOUSE_STAFF' ? 'Returns assigned for inspection will appear here.' : 'Customer return requests will appear here.'}
          onRowClick={(r) => navigate(`/returns/${r.id}`)}
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
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} return requests
      </p>
    </div>
  )
}
