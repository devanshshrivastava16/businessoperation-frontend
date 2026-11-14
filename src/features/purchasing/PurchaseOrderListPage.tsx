import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Plus } from 'lucide-react'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/api'
import { purchaseOrderApi } from '@/api/purchaseOrderApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Card, Select, StatusBadge } from '@/components/ui/primitives'
import { POFormDrawer } from './POFormDrawer'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatCurrency } from '@/utils/format'
import { formatDateTime } from '@/utils/date'
import { humanize, poStatusTone } from '@/utils/date'

const PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']

export default function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Purchasing', 'update')
  const [createOpen, setCreateOpen] = useState(false)
  const list = usePagedList<PurchaseOrder>((query) => purchaseOrderApi.list(query as never))

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO',
      sortable: true,
      render: (po) => (
        <div>
          <p className="font-medium text-ink">{po.poNumber}</p>
          <p className="text-xs text-shade-40">{formatDateTime(po.createdAt)}</p>
        </div>
      ),
    },
    { key: 'supplierName', header: 'Supplier', render: (po) => po.supplierName },
    { key: 'items', header: 'Lines', className: 'text-right', render: (po) => <span className="tabular-nums">{po.items.length}</span> },
    { key: 'total', header: 'Total', sortable: true, className: 'text-right', render: (po) => <span className="font-medium tabular-nums">{formatCurrency(po.total)}</span> },
    { key: 'status', header: 'Status', render: (po) => <StatusBadge status={po.status} tone={poStatusTone(po.status)} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Procurement lifecycle: draft → submitted → approved → receiving → received."
        actions={
          writable ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[15px] font-medium text-white hover:bg-shade-70"
            >
              <Plus className="h-4 w-4" aria-hidden /> New purchase order
            </button>
          ) : undefined
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search PO number or supplier…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by status"
            value={(list.filters.status as string) ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-52"
          >
            <option value="">All statuses</option>
            {PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(po) => po.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No purchase orders"
          emptyDescription={writable ? 'Create a purchase order to restock low inventory.' : 'Purchase orders will appear here.'}
          onRowClick={(po) => navigate(`/purchase-orders/${po.id}`)}
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

      <POFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          list.refetch()
          setCreateOpen(false)
        }}
      />

      <p className="mt-4 flex items-center gap-2 text-xs text-shade-40">
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} purchase orders
      </p>
    </div>
  )
}
