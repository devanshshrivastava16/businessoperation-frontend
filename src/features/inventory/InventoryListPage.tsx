import { useNavigate } from 'react-router-dom'
import { Boxes, Warehouse } from 'lucide-react'
import type { InventoryItem, Warehouse as WarehouseType } from '@/types/api'
import { inventoryApi } from '@/api/inventoryApi'
import { warehouseApi } from '@/api/warehouseApi'
import { usePagedList } from '@/hooks/usePagedList'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Card, Select, StockIndicator } from '@/components/ui/primitives'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'

export default function InventoryListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const canWrite = can(role, 'Inventory', 'update')

  const warehouses = useApi(() => warehouseApi.list(), [])
  const list = usePagedList<InventoryItem>((query) => inventoryApi.list(query as never))

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.name}</p>
          <p className="text-xs text-shade-40">{r.sku}</p>
        </div>
      ),
    },
    {
      key: 'warehouseName',
      header: 'Location',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Warehouse className="h-3.5 w-3.5 text-shade-40" aria-hidden />
          <span>{r.warehouseName ?? '—'}</span>
          {r.binCode && <span className="font-mono text-xs text-shade-40">{r.binCode}</span>}
        </div>
      ),
    },
    { key: 'physicalStock', header: 'On hand', sortable: true, className: 'text-right', render: (r) => <span className="tabular-nums">{r.physicalStock}</span> },
    { key: 'reservedStock', header: 'Reserved', className: 'text-right', render: (r) => <span className="tabular-nums">{r.reservedStock}</span> },
    {
      key: 'availableStock',
      header: 'Available',
      sortable: true,
      render: (r) => <StockIndicator available={r.availableStock} minimum={r.minimumStock} />,
    },
    { key: 'damagedStock', header: 'Damaged', className: 'text-right', render: (r) => <span className="tabular-nums">{r.damagedStock}</span> },
    { key: 'incomingStock', header: 'Incoming', className: 'text-right', render: (r) => <span className={`tabular-nums ${r.incomingStock > 0 ? 'text-status-green' : ''}`}>{r.incomingStock > 0 ? `+${r.incomingStock}` : '0'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`Stock across all warehouses. Available = on hand − reserved − damaged.${canWrite ? ' You can adjust and transfer stock.' : ''}`}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search product or SKU…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by warehouse"
            value={(list.filters.warehouseId as string) ?? ''}
            onChange={(e) => list.setFilter('warehouseId', e.target.value || undefined)}
            className="w-56"
          >
            <option value="">All warehouses</option>
            {warehouses.data?.data.map((w: WarehouseType) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <label className="flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white px-4 text-sm">
            <input
              type="checkbox"
              checked={list.filters.lowStock === true}
              onChange={(e) => list.setFilter('lowStock', e.target.checked || undefined)}
              className="h-4 w-4 accent-black"
            />
            Low stock only
          </label>
          <label className="flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white px-4 text-sm">
            <input
              type="checkbox"
              checked={list.filters.outOfStock === true}
              onChange={(e) => list.setFilter('outOfStock', e.target.checked || undefined)}
              className="h-4 w-4 accent-black"
            />
            Out of stock
          </label>
        </div>

        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(r) => r.productId}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No inventory rows"
          emptyDescription="Adjust the filters to see stock."
          onRowClick={(r) => navigate(`/inventory/${r.productId}`)}
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
        <Boxes className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} SKUs tracked
      </p>
    </div>
  )
}
