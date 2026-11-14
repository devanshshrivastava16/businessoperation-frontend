import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, PackageCheck, Send, XCircle } from 'lucide-react'
import type { PurchaseOrder } from '@/types/api'
import { purchaseOrderApi } from '@/api/purchaseOrderApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Card, CardHeader, ErrorState, FormField, Input, NotFoundState, PageLoader, StatusBadge, Tag } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatCurrencyPrecise, formatNumber } from '@/utils/format'
import { formatDateTime, humanize, poStatusTone } from '@/utils/date'

export default function PurchaseOrderDetailPage() {
  const { purchaseOrderId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Purchasing', 'update')
  const [busy, setBusy] = useState<'submit' | 'approve' | 'cancel' | 'receive' | null>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveLines, setReceiveLines] = useState<Record<string, { received: number; damaged: number }>>({})

  const po = useApi<PurchaseOrder>(() => purchaseOrderApi.get(purchaseOrderId), [purchaseOrderId])

  if (po.loading) return <PageLoader />
  if (po.errorStatus === 404) return <NotFoundState />
  if (po.error) return <ErrorState message={po.error} onRetry={po.refetch} />
  const order = po.data
  if (!order) return null

  const act = async (kind: 'submit' | 'approve' | 'cancel') => {
    setBusy(kind)
    try {
      if (kind === 'submit') await purchaseOrderApi.submit(order.id)
      if (kind === 'approve') await purchaseOrderApi.approve(order.id)
      if (kind === 'cancel') await purchaseOrderApi.cancel(order.id)
      toast.success(`Purchase order ${kind === 'submit' ? 'submitted' : kind === 'approve' ? 'approved' : 'cancelled'}`)
      po.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const openReceive = () => {
    setReceiveLines(
      Object.fromEntries(order.items.map((it) => [it.productId, { received: it.quantity - (it.receivedQuantity ?? 0), damaged: 0 }])),
    )
    setReceiveOpen(true)
  }

  const receive = async () => {
    setBusy('receive')
    try {
      await purchaseOrderApi.receive(order.id, {
        items: order.items
          .filter((it) => (receiveLines[it.productId]?.received ?? 0) > 0 || (receiveLines[it.productId]?.damaged ?? 0) > 0)
          .map((it) => ({
            productId: it.productId,
            receivedQuantity: receiveLines[it.productId]?.received ?? 0,
            damagedQuantity: receiveLines[it.productId]?.damaged ?? 0,
          })),
      })
      toast.success('Stock received — damaged units recorded separately')
      setReceiveOpen(false)
      po.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={order.poNumber}
        description={`${order.supplierName} · created ${formatDateTime(order.createdAt)}${order.expectedDeliveryDate ? ` · expected ${formatDateTime(order.expectedDeliveryDate)}` : ''}`}
        breadcrumbs={[{ label: 'Purchase Orders', to: '/purchase-orders' }, { label: order.poNumber }]}
        actions={
          <>
            <Link to="/purchase-orders" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Link>
            <StatusBadge status={order.status} tone={poStatusTone(order.status)} />
          </>
        }
      />

      {writable && (
        <Card className="mb-4 border-aloe">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-sm font-medium">Lifecycle:</span>
            {order.status === 'DRAFT' && (
              <Button size="sm" icon={<Send className="h-3.5 w-3.5" aria-hidden />} loading={busy === 'submit'} onClick={() => act('submit')}>
                Submit for approval
              </Button>
            )}
            {order.status === 'SUBMITTED' && (
              <Button size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} loading={busy === 'approve'} onClick={() => act('approve')}>
                Approve
              </Button>
            )}
            {['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status) && (
              <Button size="sm" icon={<PackageCheck className="h-3.5 w-3.5" aria-hidden />} onClick={openReceive}>
                Receive stock (supports partial)
              </Button>
            )}
            {!['RECEIVED', 'CANCELLED'].includes(order.status) && (
              <Button size="sm" variant="ghost" className="text-status-red" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />} loading={busy === 'cancel'} onClick={() => act('cancel')}>
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Line items" subtitle={`${formatNumber(order.items.length)} lines · total ${formatCurrencyPrecise(order.total)}`} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-shade-40">
                  <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Ordered</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Received</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Damaged</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.productId} className="border-b border-hairline/60 last:border-0">
                    <td className="px-5 py-3">
                      <Link to={`/products/${it.productId}`} className="font-medium hover:underline">{it.name}</Link>
                      <p className="text-xs text-shade-40">{it.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-status-green">{it.receivedQuantity ?? 0}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-status-red">{it.damagedQuantity ?? 0}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{formatCurrencyPrecise(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-hairline px-5 py-3 text-xs text-shade-50">
            Received stock increases available inventory; damaged units are recorded as damaged and never become sellable
            (contract section 26).
          </p>
        </Card>

        <Card>
          <CardHeader title="Status history" />
          <ol className="space-y-0 p-5">
            {order.statusHistory.map((h, i) => (
              <li key={`${h.status}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-ink" aria-hidden />
                {i < order.statusHistory.length - 1 && <span className="absolute left-[5.5px] top-4 h-full w-px bg-hairline" aria-hidden />}
                <div className="text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    {humanize(h.status)} <Tag>{formatDateTime(h.changedAt)}</Tag>
                  </p>
                  <p className="text-xs text-shade-40">by {h.changedBy}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Modal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Receive stock"
        description="Enter received and damaged quantities per line. Partial receipts are supported."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button loading={busy === 'receive'} onClick={receive}>Confirm receipt</Button>
          </>
        }
      >
        <div className="space-y-3">
          {order.items.map((it) => {
            const remaining = it.quantity - (it.receivedQuantity ?? 0)
            const line = receiveLines[it.productId] ?? { received: 0, damaged: 0 }
            return (
              <div key={it.productId} className="grid grid-cols-12 items-end gap-3 rounded-xl border border-hairline p-3">
                <div className="col-span-12 sm:col-span-6">
                  <p className="text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-shade-40">{it.sku} · ordered {it.quantity}, already received {it.receivedQuantity ?? 0}</p>
                </div>
                <FormField label={`Received (max ${remaining})`} htmlFor={`rec-${it.productId}`} >
                  <Input
                    id={`rec-${it.productId}`}
                    type="number"
                    min={0}
                    max={remaining}
                    value={line.received}
                    onChange={(e) => setReceiveLines((ls) => ({ ...ls, [it.productId]: { ...line, received: Math.max(0, Math.min(remaining, Number(e.target.value))) } }))}
                  />
                </FormField>
                <FormField label="Damaged" htmlFor={`dmg-${it.productId}`}>
                  <Input
                    id={`dmg-${it.productId}`}
                    type="number"
                    min={0}
                    value={line.damaged}
                    onChange={(e) => setReceiveLines((ls) => ({ ...ls, [it.productId]: { ...line, damaged: Math.max(0, Number(e.target.value)) } }))}
                  />
                </FormField>
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
