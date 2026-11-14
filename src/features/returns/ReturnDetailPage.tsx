import { useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2, PackageSearch, XCircle } from 'lucide-react'
import type { ItemCondition, ReturnRequest } from '@/types/api'
import { returnApi } from '@/api/returnApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Card, CardHeader, ErrorState, FormField, Input, NotFoundState, PageLoader, Select, StatusBadge, Tag, Textarea } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { PermissionGate } from '@/components/PermissionGate'
import { formatCurrencyPrecise } from '@/utils/format'
import { formatDateTime, humanize } from '@/utils/date'
import { returnStatusTone } from './ReturnPage'

export default function ReturnDetailPage() {
  const { returnId = '' } = useParams()
  const [inspectOpen, setInspectOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [condition, setCondition] = useState<ItemCondition>('GOOD')
  const [restockable, setRestockable] = useState(true)
  const [notes, setNotes] = useState('')
  const [resolution, setResolution] = useState<'REFUND' | 'REPLACEMENT'>('REFUND')
  const [amount, setAmount] = useState(0)

  const ret = useApi<ReturnRequest>(() => returnApi.get(returnId), [returnId])

  if (ret.loading) return <PageLoader />
  if (ret.errorStatus === 404) return <NotFoundState />
  if (ret.error) return <ErrorState message={ret.error} onRetry={ret.refetch} />
  const r = ret.data
  if (!r) return null

  const act = async (fn: () => Promise<unknown>, successMessage: string) => {
    setBusy(successMessage)
    try {
      await fn()
      toast.success(successMessage)
      ret.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const approve = () => act(() => returnApi.approve(r.id), 'Return approved — send it to inspection')
  const reject = () => act(() => returnApi.reject(r.id), 'Return rejected')

  const submitInspection = () =>
    act(
      () => returnApi.inspect(r.id, { condition, restockable, notes: notes || undefined }),
      'Inspection recorded',
    )

  const submitResolution = () =>
    act(
      () =>
        returnApi.resolve(r.id, {
          resolution,
          amount: resolution === 'REFUND' ? amount : undefined,
        }),
      resolution === 'REFUND' ? 'Refund processed' : 'Replacement queued',
    )

  const openInspect = () => {
    setCondition(r.inspection?.condition ?? 'GOOD')
    setRestockable(r.inspection?.restockable ?? true)
    setNotes(r.inspection?.notes ?? '')
    setInspectOpen(true)
  }

  const openResolve = () => {
    setResolution('REFUND')
    setAmount(r.refundAmount)
    setResolveOpen(true)
  }

  return (
    <div>
      <PageHeader
        title={r.returnNumber}
        description={`Order ${r.orderNumber} · ${r.customerName} · created ${formatDateTime(r.createdAt)}`}
        breadcrumbs={[{ label: 'Returns', to: '/returns' }, { label: r.returnNumber }]}
        actions={<StatusBadge status={r.status} tone={returnStatusTone(r.status)} />}
      />

      <PermissionGate module="Returns" min="update">
        <Card className="mb-4 border-aloe">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-sm font-medium">Workflow:</span>
            {r.status === 'REQUESTED' && (
              <>
                <Button size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} loading={busy === 'Return approved — send it to inspection'} onClick={approve}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" className="text-status-red" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />} loading={busy === 'Return rejected'} onClick={reject}>
                  Reject
                </Button>
              </>
            )}
            {r.status === 'APPROVED' && (
              <Button size="sm" icon={<PackageSearch className="h-3.5 w-3.5" aria-hidden />} onClick={openInspect}>
                Inspect items
              </Button>
            )}
            {r.status === 'INSPECTED' && (
              <Button size="sm" onClick={openResolve}>
                Resolve ({r.inspection?.restockable ? 'restockable' : 'non-restockable'})
              </Button>
            )}
            {r.status === 'RESOLVED' && (
              <Tag tone="mint">Resolved via {humanize(r.resolution ?? '')}</Tag>
            )}
          </div>
        </Card>
      </PermissionGate>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Returned items" subtitle={`Reason: ${humanize(r.reason)}`} />
          <ul className="divide-y divide-hairline">
            {r.items.map((it) => (
              <li key={it.orderItemId} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <div>
                  <p className="font-medium">{it.name}</p>
                  <p className="text-xs text-shade-40">{it.sku}</p>
                </div>
                <span className="tabular-nums">qty {it.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-hairline px-5 py-3 text-sm">
            Refund value: <strong className="tabular-nums">{formatCurrencyPrecise(r.refundAmount)}</strong>
          </p>
        </Card>

        <Card>
          <CardHeader title="Inspection" />
          <div className="p-5 text-sm">
            {r.inspection ? (
              <dl className="space-y-2.5">
                <div className="flex justify-between">
                  <dt className="text-shade-50">Condition</dt>
                  <dd><StatusBadge status={r.inspection.condition} tone={r.inspection.condition === 'GOOD' ? 'green' : 'red'} /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-shade-50">Restockable</dt>
                  <dd className="font-medium">{r.inspection.restockable ? 'Yes' : 'No'}</dd>
                </div>
                {r.inspection.notes && (
                  <div>
                    <dt className="text-shade-50">Notes</dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-shade-60">{r.inspection.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-shade-50">
                Not inspected yet. Restocking rule: items restock only when condition is GOOD and marked restockable.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={inspectOpen}
        onClose={() => setInspectOpen(false)}
        title="Inspect returned items"
        description="Record the condition and restock decision."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInspectOpen(false)}>Cancel</Button>
            <Button loading={busy === 'Inspection recorded'} onClick={submitInspection}>Save inspection</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Condition" htmlFor="ins-condition" required>
            <Select id="ins-condition" value={condition} onChange={(e) => setCondition(e.target.value as ItemCondition)}>
              <option value="GOOD">Good — as new</option>
              <option value="DAMAGED">Damaged</option>
              <option value="DEFECTIVE">Defective</option>
            </Select>
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={restockable} onChange={(e) => setRestockable(e.target.checked)} className="h-4 w-4 accent-black" />
            Restockable (goes back to sellable inventory)
          </label>
          <FormField label="Notes" htmlFor="ins-notes">
            <Textarea id="ins-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Broken clasp" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title="Resolve return"
        description="Choose refund or replacement."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button loading={Boolean(busy)} onClick={submitResolution}>Confirm resolution</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Resolution" htmlFor="res-type" required>
            <Select id="res-type" value={resolution} onChange={(e) => setResolution(e.target.value as 'REFUND' | 'REPLACEMENT')}>
              <option value="REFUND">Refund</option>
              <option value="REPLACEMENT">Replacement</option>
            </Select>
          </FormField>
          {resolution === 'REFUND' && (
            <FormField label="Refund amount" htmlFor="res-amount" required>
              <Input id="res-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </FormField>
          )}
          {resolution === 'REPLACEMENT' && (
            <p className="text-sm text-shade-50">A replacement order will be queued for fulfillment.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
