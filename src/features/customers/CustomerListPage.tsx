import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Customer } from '@/types/api'
import { customerApi } from '@/api/customerApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Card, Select, Tag } from '@/components/ui/primitives'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'
import { useAuthStore } from '@/store/authStore'

const SEGMENTS: Customer['segment'][] = ['VIP', 'REPEAT', 'NEW']

function segmentTone(segment: Customer['segment']): 'aloe' | 'slate' | 'amber' {
  if (segment === 'VIP') return 'aloe'
  if (segment === 'REPEAT') return 'slate'
  return 'amber'
}

export default function CustomerListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const limited = role === 'WAREHOUSE_STAFF'
  const list = usePagedList<Customer>((query) => customerApi.list(query as never))

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{c.name}</p>
            <p className="truncate text-xs text-shade-40">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'segment', header: 'Segment', render: (c) => <Tag tone={segmentTone(c.segment) === 'aloe' ? 'mint' : 'shade'}>{c.segment}</Tag> },
    { key: 'totalOrders', header: 'Orders', sortable: true, className: 'text-right', render: (c) => <span className="tabular-nums">{c.totalOrders}</span> },
    ...(limited
      ? []
      : [
          {
            key: 'totalSpent',
            header: 'Lifetime spend',
            sortable: true,
            className: 'text-right',
            render: (c: Customer) => <span className="font-medium tabular-nums">{formatCurrency(c.totalSpent)}</span>,
          } satisfies Column<Customer>,
        ]),
    { key: 'createdAt', header: 'Since', render: (c) => formatDate(c.createdAt) },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Shopify customer directory with segments and order history."
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or email…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by segment"
            value={(list.filters.segment as string) ?? ''}
            onChange={(e) => list.setFilter('segment', e.target.value || undefined)}
            className="w-40"
          >
            <option value="">All segments</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(c) => c.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No customers found"
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
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
        <Users className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} customers
      </p>
    </div>
  )
}
