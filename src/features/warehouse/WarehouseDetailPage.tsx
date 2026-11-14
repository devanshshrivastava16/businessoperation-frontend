import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Layers, PackageSearch } from 'lucide-react'
import type { Bin, Rack, Shelf, Warehouse, Zone } from '@/types/api'
import { warehouseApi } from '@/api/warehouseApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Card, CardHeader, ErrorState, NotFoundState, PageLoader, Tag } from '@/components/ui/primitives'
import { SearchInput } from '@/components/ui/Table'

export default function WarehouseDetailPage() {
  const { warehouseId = '' } = useParams()
  const [binSearch, setBinSearch] = useState('')

  const warehouse = useApi<Warehouse>(() => warehouseApi.get(warehouseId), [warehouseId])
  const zones = useApi(() => warehouseApi.zones(warehouseId), [warehouseId])
  const racks = useApi(() => warehouseApi.racks(warehouseId), [warehouseId])
  const shelves = useApi(() => warehouseApi.shelves(warehouseId), [warehouseId])
  const bins = useApi(() => warehouseApi.bins(warehouseId, { search: binSearch || undefined }), [warehouseId, binSearch])

  if (warehouse.loading) return <PageLoader />
  if (warehouse.errorStatus === 404) return <NotFoundState />
  if (warehouse.error) return <ErrorState message={warehouse.error} onRetry={warehouse.refetch} />
  const wh = warehouse.data
  if (!wh) return null

  const zoneList = zones.data?.data ?? []
  const rackList = racks.data?.data ?? []
  const shelfList = shelves.data?.data ?? []
  const binList = bins.data?.data ?? []

  const utilization = binList.length > 0
    ? Math.round((binList.reduce((s, b) => s + b.occupied, 0) / binList.reduce((s, b) => s + b.capacity, 0)) * 100)
    : 0

  return (
    <div>
      <PageHeader
        title={wh.name}
        description={`${wh.code} · ${wh.address}, ${wh.city}`}
        breadcrumbs={[{ label: 'Warehouses', to: '/warehouses' }, { label: wh.code }]}
        actions={
          <Link to="/warehouses" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
        }
      />

      {/* Hierarchy overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Zones" subtitle="Top of the location hierarchy" actions={<Layers className="h-4 w-4 text-shade-40" aria-hidden />} />
          <ul className="divide-y divide-hairline">
            {zoneList.map((z: Zone) => {
              const zoneRacks = rackList.filter((r: Rack) => r.zoneId === z.id)
              return (
                <li key={z.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      <span className="mr-2 rounded-md bg-ink px-1.5 py-0.5 font-mono text-xs text-white">{z.code}</span>
                      {z.name}
                    </p>
                    <Tag>{zoneRacks.length} racks</Tag>
                  </div>
                  {z.description && <p className="mt-1 text-xs text-shade-40">{z.description}</p>}
                  <ul className="mt-2 space-y-1 pl-1">
                    {zoneRacks.map((r) => {
                      const rackShelves = shelfList.filter((s: Shelf) => s.rackId === r.id)
                      return (
                        <li key={r.id} className="text-xs text-shade-60">
                          <span className="font-mono">{r.code}</span>
                          <span className="text-shade-40"> — shelves {rackShelves.map((s) => s.code).join(', ') || '—'}</span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
            {zoneList.length === 0 && <li className="px-5 py-6 text-center text-sm text-shade-50">No zones defined.</li>}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Bins"
            subtitle={`${binList.length} bins · ${utilization}% capacity utilized`}
            actions={
              <SearchInput
                value={binSearch}
                onChange={setBinSearch}
                placeholder="Search bin code…"
                label="Search bins"
                className="w-56"
              />
            }
          />
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-shade-40">
                  <th scope="col" className="px-5 py-2.5 font-medium">Bin code</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Shelf</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Capacity</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Occupied</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Fill</th>
                </tr>
              </thead>
              <tbody>
                {binList.map((b: Bin) => {
                  const fill = b.capacity > 0 ? Math.round((b.occupied / b.capacity) * 100) : 0
                  return (
                    <tr key={b.id} className="border-b border-hairline/60 last:border-0">
                      <td className="px-5 py-2.5 font-mono text-xs">{b.code}</td>
                      <td className="px-5 py-2.5 text-xs text-shade-50">{shelfList.find((s: Shelf) => s.id === b.shelfId)?.code ?? '—'}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{b.capacity}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{b.occupied}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-shade-30/40" role="presentation">
                            <div
                              className={`h-full rounded-full ${fill > 90 ? 'bg-status-red' : fill > 70 ? 'bg-status-amber' : 'bg-status-green'}`}
                              style={{ width: `${Math.min(100, fill)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-shade-50">{fill}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {binList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-shade-50">
                      <PackageSearch className="mx-auto mb-2 h-6 w-6 text-shade-30" aria-hidden />
                      No bins match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="mt-4">
        <Badge tone="aloe">{zoneList.length} zones</Badge>{' '}
        <Badge tone="slate">{rackList.length} racks</Badge>{' '}
        <Badge tone="slate">{shelfList.length} shelves</Badge>{' '}
        <Badge tone="slate">{binList.length} bins</Badge>
      </p>
    </div>
  )
}
