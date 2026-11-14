import { useNavigate } from 'react-router-dom'
import { MapPin, Warehouse as WarehouseIcon } from 'lucide-react'
import type { Warehouse } from '@/types/api'
import { warehouseApi } from '@/api/warehouseApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Card, CardHeader, ErrorState, PageLoader } from '@/components/ui/primitives'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'

export default function WarehouseListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Warehouse', 'update')
  const warehouses = useApi(() => warehouseApi.list(), [])

  if (warehouses.loading) return <PageLoader />
  if (warehouses.error) return <ErrorState message={warehouses.error} onRetry={warehouses.refetch} />

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Physical hierarchy: warehouse → zone → rack → shelf → bin."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {warehouses.data?.data.map((w: Warehouse) => (
          <Card key={w.id}>
            <CardHeader
              title={w.name}
              subtitle={`${w.code} · ${w.city}`}
              actions={<Badge tone={w.active ? 'green' : 'red'}>{w.active ? 'Active' : 'Inactive'}</Badge>}
            />
            <button
              type="button"
              onClick={() => navigate(`/warehouses/${w.id}`)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-shade-30/20"
              aria-label={`Open ${w.name} details`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-aloe text-ink">
                <WarehouseIcon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{w.address}</span>
                <span className="mt-0.5 block text-xs text-shade-40">
                  {w.zoneCount ?? 0} zones · {w.binCount ?? 0} bins
                </span>
              </span>
              <MapPin className="h-4 w-4 shrink-0 text-shade-40" aria-hidden />
            </button>
          </Card>
        ))}
      </div>
      {!writable && (
        <p className="mt-4 text-xs text-shade-40">Your role has read-only access to warehouse structure.</p>
      )}
    </div>
  )
}
