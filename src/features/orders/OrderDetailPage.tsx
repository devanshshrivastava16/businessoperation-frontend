import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardList, CreditCard, MapPin, Package, Truck, Undo2, XCircle } from 'lucide-react'
import type { Order, OrderStatus, OrderStatusHistoryEntry } from '@/types/api'
import { orderApi } from '@/api/orderApi'
import { pickingApi } from '@/api/pickingApi'
import { packingApi } from '@/api/packingApi'
import { returnApi } from '@/api/returnApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Button, Card, CardHeader, ErrorState, NotFoundState, PageLoader, StatusBadge } from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatCurrencyPrecise, formatNumber } from '@/utils/format'
import { formatDateTime, humanize, orderStatusTone } from '@/utils/date'

/** Allowed transitions per contract section 9.2 — mirrored in backend. */
const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKING', 'CANCELLED'],
  PICKING: ['PICKED', 'CANCELLED'],
  PICKED: ['PACKING'],
  PACKING: ['PACKED'],
  PACKED: ['READY_TO_SHIP'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const canFulfill = can(role, 'Orders', 'update')
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const order = useApi<Order>(() => orderApi.get(orderId), [orderId])
  const history = useApi(() => orderApi.statusHistory(orderId), [orderId])

  if (order.loading) return <PageLoader />
  if (order.errorStatus === 404) return <NotFoundState />
  if (order.error) return <ErrorState message={order.error} onRetry={order.refetch} />
  const o = order.data
  if (!o) return null

  const refreshAll = () => {
    order.refetch()
    history.refetch()
  }

  const applyStatus = async (status: OrderStatus) => {
    setTransitioning(true)
    try {
      await orderApi.updateStatus(orderId, { status })
      toast.success(`Order moved to ${humanize(status)}`)
      setNextStatus('')
      refreshAll()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setTransitioning(false)
    }
  }

  const cancelOrder = async () => {
    setTransitioning(true)
    try {
      await orderApi.cancel(orderId, 'Cancelled from operations dashboard')
      toast.success('Order cancelled — inventory reservations released')
      setCancelOpen(false)
      refreshAll()
    } catch (err) {
      toast.error(toApiError(err).message)
      setCancelOpen(false)
    } finally {
      setTransitioning(false)
    }
  }

  const generatePickList = async () => {
    try {
      const pl = await pickingApi.generatePickList(orderId)
      toast.success(`Pick list ${pl.pickListId} ready`)
      await orderApi.updateStatus(orderId, { status: 'PICKING' })
      refreshAll()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const createPackingTask = async () => {
    try {
      await packingApi.createTask(orderId)
      toast.success('Packing task created — open the packing queue')
      await orderApi.updateStatus(orderId, { status: 'PACKING' })
      refreshAll()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const createReturn = async () => {
    try {
      await returnApi.create({
        orderId,
        reason: 'DAMAGED',
        items: o.items.map((it) => ({ orderItemId: it.id, quantity: it.quantity })),
      })
      toast.success('Return request created')
      refreshAll()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const options = canFulfill ? (NEXT_STATUSES[o.status] ?? []) : []

  return (
    <div>
      <PageHeader
        title={`Order ${o.orderNumber}`}
        description={`${o.customerName} · ${formatDateTime(o.createdAt)} · ${humanize(o.channel)}`}
        breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: o.orderNumber }]}
        actions={
          <>
            <Link to="/orders" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Link>
            <StatusBadge status={o.status} tone={orderStatusTone(o.status)} />
          </>
        }
      />

      {/* Fulfillment actions */}
      {canFulfill && !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status) && (
        <Card className="mb-4 border-aloe">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-sm font-medium">Actions:</span>
            {o.status === 'CONFIRMED' && (
              <Button size="sm" icon={<ClipboardList className="h-3.5 w-3.5" aria-hidden />} onClick={generatePickList}>
                Generate pick list
              </Button>
            )}
            {o.status === 'PICKED' && (
              <Button size="sm" icon={<Package className="h-3.5 w-3.5" aria-hidden />} onClick={createPackingTask}>
                Create packing task
              </Button>
            )}
            {['DELIVERED'].includes(o.status) && (
              <Button size="sm" variant="outline" icon={<Undo2 className="h-3.5 w-3.5" aria-hidden />} onClick={createReturn}>
                Register return
              </Button>
            )}
            {options.length > 0 && (
              <>
                <select
                  aria-label="Change order status"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                  className="min-h-[36px] rounded-full border border-hairline bg-white px-3 text-sm"
                >
                  <option value="">Move to status…</option>
                  {options.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={!nextStatus || transitioning} loading={transitioning && Boolean(nextStatus)} onClick={() => nextStatus && applyStatus(nextStatus)}>
                  Apply
                </Button>
              </>
            )}
            {['PENDING', 'CONFIRMED', 'PICKING'].includes(o.status) && (
              <Button size="sm" variant="ghost" className="text-status-red" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />} onClick={() => setCancelOpen(true)}>
                Cancel order
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Items */}
        <Card className="xl:col-span-2">
          <CardHeader title="Items" subtitle={`${formatNumber(o.itemCount)} line items`} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-shade-40">
                  <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Qty</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Unit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id} className="border-b border-hairline/60 last:border-0">
                    <td className="px-5 py-3">
                      <Link to={`/products/${it.productId}`} className="font-medium hover:underline">{it.name}</Link>
                      <p className="text-xs text-shade-40">{it.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyPrecise(it.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{formatCurrencyPrecise(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="space-y-1.5 border-t border-hairline px-5 py-4 text-sm">
            <div className="flex justify-between"><dt className="text-shade-50">Subtotal</dt><dd className="tabular-nums">{formatCurrencyPrecise(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Shipping</dt><dd className="tabular-nums">{formatCurrencyPrecise(o.shippingFee)}</dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Discount</dt><dd className="tabular-nums">−{formatCurrencyPrecise(o.discount)}</dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Tax</dt><dd className="tabular-nums">{formatCurrencyPrecise(o.tax)}</dd></div>
            <div className="flex justify-between border-t border-hairline pt-1.5 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatCurrencyPrecise(o.total)}</dd></div>
          </dl>
        </Card>

        <div className="space-y-4">
          {/* Customer + shipping */}
          <Card>
            <CardHeader title="Customer & shipping" actions={<MapPin className="h-4 w-4 text-shade-40" aria-hidden />} />
            <div className="space-y-3 p-5 text-sm">
              <div>
                <p className="font-medium">{o.customerName}</p>
                <p className="text-shade-50">{o.customerEmail}</p>
                {o.customerPhone && <p className="text-shade-50">{o.customerPhone}</p>}
              </div>
              <div className="rounded-lg bg-shade-30/20 p-3 text-xs leading-relaxed text-shade-60">
                {o.shippingAddress.line1}
                {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''}
                <br />
                {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postalCode}
                <br />
                {o.shippingAddress.country}
              </div>
              {o.trackingNumber && (
                <p className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-shade-40" aria-hidden />
                  Tracking: <span className="font-mono text-xs">{o.trackingNumber}</span>
                </p>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader title="Payment" actions={<CreditCard className="h-4 w-4 text-shade-40" aria-hidden />} />
            <dl className="space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-shade-50">Method</dt><dd className="font-medium">{o.payment.method}</dd></div>
              <div className="flex justify-between">
                <dt className="text-shade-50">Status</dt>
                <dd><StatusBadge status={o.payment.status} tone={o.payment.status === 'PAID' ? 'green' : o.payment.status === 'REFUNDED' ? 'red' : 'amber'} /></dd>
              </div>
              <div className="flex justify-between"><dt className="text-shade-50">Transaction</dt><dd className="font-mono text-xs">{o.payment.transactionId}</dd></div>
              {o.payment.paidAt && <div className="flex justify-between"><dt className="text-shade-50">Paid at</dt><dd>{formatDateTime(o.payment.paidAt)}</dd></div>}
            </dl>
          </Card>

          {/* History */}
          <Card>
            <CardHeader title="Status history" />
            <ol className="space-y-0 p-5">
              {history.data?.data.map((h: OrderStatusHistoryEntry, i) => (
                <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="mt-1 flex h-3 w-3 shrink-0 rounded-full bg-ink" aria-hidden />
                  {i < (history.data?.data.length ?? 0) - 1 && (
                    <span className="absolute left-[5.5px] top-4 h-full w-px bg-hairline" aria-hidden />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">{humanize(h.toStatus)}</p>
                    <p className="text-xs text-shade-40">{formatDateTime(h.changedAt)} · {h.changedBy}</p>
                    {h.note && <p className="mt-0.5 text-xs text-shade-50">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancelOrder}
        title="Cancel order"
        message="Cancelling releases any inventory reservations for this order. This cannot be undone."
        confirmLabel="Cancel order"
        destructive
        loading={transitioning}
      />

      <PermissionGate module="Orders" min="update">
        <p className="mt-4 text-xs text-shade-40">
          Status transitions follow the contract state machine; the backend rejects invalid transitions with
          INVALID_STATE_TRANSITION.
        </p>
      </PermissionGate>
    </div>
  )
}
