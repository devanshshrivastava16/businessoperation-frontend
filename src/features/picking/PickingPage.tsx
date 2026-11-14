import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2, ClipboardList, MapPin, TriangleAlert } from 'lucide-react'
import type { OrderSummary, PickList } from '@/types/api'
import { orderApi } from '@/api/orderApi'
import { pickingApi } from '@/api/pickingApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Button, Card, CardHeader, ErrorState, Tag } from '@/components/ui/primitives'
import { formatDateTime } from '@/utils/date'

/**
 * Picking workflow.
 * The contract exposes POST /orders/{orderId}/pick-list, per-item pick and
 * completion — the queue itself is derived from the orders list endpoint
 * (statuses CONFIRMED = ready to pick, PICKING = in progress).
 */
export default function PickingPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [pickList, setPickList] = useState<PickList | null>(null)
  const [pickListLoading, setPickListLoading] = useState(false)
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const queue = useApi(() => orderApi.list({ status: 'PICKING', size: 20 }), [])
  const ready = useApi(() => orderApi.list({ status: 'CONFIRMED', size: 20 }), [])

  useEffect(() => {
    if (!selectedOrderId) {
      setPickList(null)
      return
    }
    let cancelled = false
    setPickListLoading(true)
    pickingApi
      .generatePickList(selectedOrderId)
      .then((pl) => {
        if (!cancelled) setPickList(pl)
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(toApiError(err).message)
      })
      .finally(() => {
        if (!cancelled) setPickListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedOrderId])

  const pickItem = async (itemId: string, shortage: boolean) => {
    if (!pickList) return
    setBusyItem(itemId)
    try {
      const item = pickList.items.find((it) => it.itemId === itemId)
      await pickingApi.pickItem(pickList.pickListId, itemId, {
        pickedQuantity: shortage ? 0 : (item?.quantity ?? 0),
        shortage,
      })
      const updated = await pickingApi.generatePickList(pickList.orderId)
      setPickList(updated)
      if (shortage) toast.success('Shortage recorded')
      else toast.success('Item picked')
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusyItem(null)
    }
  }

  const completePicking = async () => {
    if (!pickList) return
    setCompleting(true)
    try {
      await pickingApi.complete(pickList.pickListId)
      toast.success('Picking complete — order is now PICKED')
      setPickList(null)
      setSelectedOrderId(null)
      queue.refetch()
      ready.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setCompleting(false)
    }
  }

  const allDone = pickList ? pickList.items.every((it) => it.picked || it.shortage) : false
  const queueRows: OrderSummary[] = [
    ...(queue.data?.content ?? []),
    ...(ready.data?.content ?? []),
  ]

  return (
    <div>
      <PageHeader
        title="Picking"
        description="Warehouse picking workflow: select an order, pick each item from its bin, report shortages, complete."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Queue */}
        <Card className="lg:col-span-1">
          <CardHeader title="Pick queue" subtitle="Ready to pick (confirmed) and in-progress orders" />
          <ul className="divide-y divide-hairline">
            {queue.loading && <li className="p-5 text-sm text-shade-50">Loading queue…</li>}
            {queue.error && <ErrorState message={queue.error} onRetry={queue.refetch} />}
            {queueRows.length === 0 && !queue.loading && (
              <li className="px-5 py-8 text-center text-sm text-shade-50">
                <ClipboardList className="mx-auto mb-2 h-6 w-6 text-shade-30" aria-hidden />
                Queue is empty — nothing to pick.
              </li>
            )}
            {queueRows.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm transition-colors ${
                    selectedOrderId === o.id ? 'bg-aloe/50' : 'hover:bg-shade-30/20'
                  }`}
                  aria-pressed={selectedOrderId === o.id}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{o.orderNumber}</span>
                    <span className="block truncate text-xs text-shade-40">{o.customerName} · {o.itemCount} items</span>
                  </span>
                  <Badge tone={o.status === 'PICKING' ? 'aloe' : 'slate'}>{o.status === 'PICKING' ? 'In progress' : 'Ready'}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Task detail */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={pickList ? `Pick list — order ${pickList.orderNumber ?? ''}` : 'Pick list'}
            subtitle={pickList ? `Picker: ${pickList.assignedPicker ?? 'Unassigned'}` : 'Select an order from the queue'}
            actions={
              pickList && (
                <Tag tone="mint">{pickList.items.filter((i) => i.picked || i.shortage).length}/{pickList.items.length} done</Tag>
              )
            }
          />
          {!selectedOrderId && !pickListLoading && (
            <p className="px-5 py-10 text-center text-sm text-shade-50">
              Choose an order to generate or open its pick list.
            </p>
          )}
          {pickListLoading && <p className="px-5 py-10 text-center text-sm text-shade-50">Loading pick list…</p>}
          {pickList && (
            <>
              <ul className="divide-y divide-hairline">
                {pickList.items.map((item) => (
                  <li key={item.itemId} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${item.picked ? 'opacity-60' : ''}`}>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        item.picked ? 'bg-status-green-bg text-status-green' : item.shortage ? 'bg-status-amber-bg text-status-amber' : 'bg-shade-30/40 text-shade-50'
                      }`}
                      aria-hidden
                    >
                      {item.picked ? <CheckCircle2 className="h-4 w-4" /> : item.shortage ? <TriangleAlert className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name ?? item.sku}</p>
                      <p className="flex items-center gap-1.5 text-xs text-shade-40">
                        {item.sku} · required {item.quantity}
                        <MapPin className="h-3 w-3" aria-hidden />
                        <span className="font-mono">{item.location}</span>
                      </p>
                    </div>
                    {!item.picked && !item.shortage && (
                      <div className="flex gap-2">
                        <Button size="sm" loading={busyItem === item.itemId} onClick={() => pickItem(item.itemId, false)}>
                          Mark picked
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => pickItem(item.itemId, true)}>
                          Shortage
                        </Button>
                      </div>
                    )}
                    {(item.picked || item.shortage) && (
                      <Badge tone={item.picked ? 'green' : 'amber'}>
                        {item.picked ? `Picked ${item.pickedQuantity}/${item.quantity}` : 'Shortage flagged'}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4">
                <p className="text-xs text-shade-50">
                  Shortages keep the task open for supervisor review; completion requires every item picked or flagged.
                </p>
                <div className="flex items-center gap-2">
                  {pickList.orderId && (
                    <Link to={`/orders/${pickList.orderId}`} className="text-sm underline">
                      View order
                    </Link>
                  )}
                  <Button loading={completing} disabled={!allDone} onClick={completePicking}>
                    Complete picking
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-shade-40">Pick lists generated at: {pickList?.createdAt ? formatDateTime(pickList.createdAt) : '—'}</p>
    </div>
  )
}
