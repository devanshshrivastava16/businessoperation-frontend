import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckSquare, Package, Square } from 'lucide-react'
import type { ConfirmPackageRequest, OrderSummary, PackagingType, PackingTask } from '@/types/api'
import { orderApi } from '@/api/orderApi'
import { packingApi } from '@/api/packingApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Button, Card, CardHeader, ErrorState, FormField, Input, Select, Tag } from '@/components/ui/primitives'
import { formatDateTime, humanize } from '@/utils/date'

const PACKAGING_TYPES: PackagingType[] = ['SMALL_BOX', 'MEDIUM_BOX', 'LARGE_BOX', 'BUBBLE_MAILER', 'POLY_BAG']

/**
 * Packing workflow.
 * The contract exposes POST /orders/{orderId}/packing and
 * POST /packing/{packingId}/complete — the queue is derived from orders
 * with status PACKING / PICKED.
 */
export default function PackingPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [task, setTask] = useState<PackingTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [packageCount, setPackageCount] = useState(1)
  const [weight, setWeight] = useState(350)
  const [packagingType, setPackagingType] = useState<PackagingType>('SMALL_BOX')

  const queue = useApi(() => orderApi.list({ status: 'PACKING', size: 20 }), [])
  const readyToPack = useApi(() => orderApi.list({ status: 'PICKED', size: 20 }), [])

  useEffect(() => {
    if (!selectedOrderId) {
      setTask(null)
      return
    }
    let cancelled = false
    setLoading(true)
    packingApi
      .createTask(selectedOrderId)
      .then((t) => {
        if (!cancelled) {
          setTask(t)
          setPackageCount(1)
          setWeight(t.weightGrams ?? 350)
          setPackagingType(t.packagingType ?? 'SMALL_BOX')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(toApiError(err).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedOrderId])

  const toggleVerified = (productId: string) => {
    if (!task) return
    setTask({
      ...task,
      items: task.items.map((it) => (it.productId === productId ? { ...it, verified: !it.verified } : it)),
    })
  }

  const complete = async () => {
    if (!task) return
    setSubmitting(true)
    try {
      const body: ConfirmPackageRequest = { packageCount, weightGrams: weight, packagingType }
      await packingApi.complete(task.packingId, body)
      toast.success('Package confirmed — order is PACKED and ready to ship')
      setTask(null)
      setSelectedOrderId(null)
      queue.refetch()
      readyToPack.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  const allVerified = task ? task.items.every((it) => it.verified) : false
  const queueRows: OrderSummary[] = [...(readyToPack.data?.content ?? []), ...(queue.data?.content ?? [])]

  return (
    <div>
      <PageHeader
        title="Packing"
        description="Verify every picked item, record package details, and confirm to move the order to ready-to-ship."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Packing queue" subtitle="Picked orders awaiting packing" />
          <ul className="divide-y divide-hairline">
            {queue.loading && <li className="p-5 text-sm text-shade-50">Loading queue…</li>}
            {queue.error && <ErrorState message={queue.error} onRetry={queue.refetch} />}
            {queueRows.length === 0 && !queue.loading && (
              <li className="px-5 py-8 text-center text-sm text-shade-50">
                <Package className="mx-auto mb-2 h-6 w-6 text-shade-30" aria-hidden />
                Nothing to pack right now.
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
                  <Badge tone={o.status === 'PACKING' ? 'aloe' : 'slate'}>{humanize(o.status)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={task ? `Packing task — order ${task.orderNumber ?? ''}` : 'Packing task'}
            subtitle="Verify items against the pick list before confirming"
            actions={task && <Tag tone="mint">{task.items.filter((i) => i.verified).length}/{task.items.length} verified</Tag>}
          />
          {!selectedOrderId && !loading && (
            <p className="px-5 py-10 text-center text-sm text-shade-50">Select an order from the queue to start packing.</p>
          )}
          {loading && <p className="px-5 py-10 text-center text-sm text-shade-50">Preparing packing task…</p>}
          {task && (
            <>
              <ul className="divide-y divide-hairline">
                {task.items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3 px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleVerified(item.productId)}
                      aria-pressed={item.verified}
                      aria-label={`${item.verified ? 'Unverify' : 'Verify'} ${item.name}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                        item.verified ? 'bg-status-green-bg text-status-green' : 'bg-shade-30/40 text-shade-50 hover:bg-shade-30'
                      }`}
                    >
                      {item.verified ? <CheckSquare className="h-4 w-4" aria-hidden /> : <Square className="h-4 w-4" aria-hidden />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-shade-40">{item.sku} · qty {item.quantity}</p>
                    </div>
                    {item.verified && <Badge tone="green">Verified</Badge>}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 gap-4 border-t border-hairline p-5 sm:grid-cols-3">
                <FormField label="Packages" htmlFor="pk-count">
                  <Input id="pk-count" type="number" min={1} value={packageCount} onChange={(e) => setPackageCount(Math.max(1, Number(e.target.value)))} />
                </FormField>
                <FormField label="Total weight (g)" htmlFor="pk-weight">
                  <Input id="pk-weight" type="number" min={0} value={weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))} />
                </FormField>
                <FormField label="Packaging type" htmlFor="pk-type">
                  <Select id="pk-type" value={packagingType} onChange={(e) => setPackagingType(e.target.value as PackagingType)}>
                    {PACKAGING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {humanize(t)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4">
                <p className="text-xs text-shade-50">
                  Completion requires all items verified. Weight feeds shipping cost and profit analytics.
                </p>
                <div className="flex items-center gap-2">
                  {task.orderId && (
                    <Link to={`/orders/${task.orderId}`} className="text-sm underline">
                      View order
                    </Link>
                  )}
                  <Button loading={submitting} disabled={!allVerified} onClick={complete}>
                    Confirm package
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-shade-40">Task created at: {task?.createdAt ? formatDateTime(task.createdAt) : '—'}</p>
    </div>
  )
}
