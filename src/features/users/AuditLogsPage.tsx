import { useState } from 'react'
import { FileClock } from 'lucide-react'
import type { AuditLog } from '@/types/api'
import { auditApi } from '@/api/userApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, DateRangePicker, Pagination, type Column } from '@/components/ui/Table'
import { Card, Select, Tag } from '@/components/ui/primitives'
import { formatDateTime } from '@/utils/date'

const ENTITY_TYPES = ['PRODUCT', 'ORDER', 'INVENTORY', 'PURCHASE_ORDER', 'USER', 'RETURN']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN']

export default function AuditLogsPage() {
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const list = usePagedList<AuditLog>((query) => auditApi.list({ ...query, from: range.from, to: range.to } as never))

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', header: 'When', render: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</span> },
    { key: 'userName', header: 'User', render: (l) => l.userName },
    { key: 'action', header: 'Action', render: (l) => <Tag>{l.action}</Tag> },
    { key: 'entityType', header: 'Entity', render: (l) => <span className="font-mono text-xs">{l.entityType}</span> },
    { key: 'summary', header: 'Summary', render: (l) => <span className="text-xs text-shade-60">{l.summary}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Every sensitive action is recorded: who changed what, and when."
        actions={
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
            presets={[{ label: '7D', days: 7 }, { label: '14D', days: 14 }]}
          />
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <Select
            aria-label="Filter by entity type"
            value={(list.filters.entityType as string) ?? ''}
            onChange={(e) => list.setFilter('entityType', e.target.value || undefined)}
            className="w-48"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by action"
            value={(list.filters.action as string) ?? ''}
            onChange={(e) => list.setFilter('action', e.target.value || undefined)}
            className="w-44"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(l) => l.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No audit entries"
          emptyDescription="Try widening the date range or clearing filters."
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
        <FileClock className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} entries
      </p>
    </div>
  )
}
