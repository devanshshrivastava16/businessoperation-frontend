import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowDownRight, ArrowUpRight, History } from 'lucide-react'
import type { InventoryDetail, InventoryMovement } from '@/types/api'
import { inventoryApi } from '@/api/inventoryApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/Table'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  FormField,
  Input,
  NotFoundState,
  PageLoader,
  Select,
  StockIndicator,
  Tag,
} from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatDateTime, humanize } from '@/utils/date'

const adjustSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity is required' })
    .int('Must be a whole number')
    .refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.enum(['DAMAGED', 'CYCLE_COUNT', 'SUPPLIER_RETURN', 'FOUND', 'OTHER'], { errorMap: () => ({ message: 'Select a reason' }) }),
  note: z.string().max(500, 'Note is too long').optional(),
})

type AdjustValues = z.infer<typeof adjustSchema>

function AdjustStockModal({
  productId,
  availableStock,
  open,
  onClose,
  onSaved,
}: {
  productId: string
  availableStock: number
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AdjustValues>({ resolver: zodResolver(adjustSchema) })

  const quantity = watch('quantity')

  const onSubmit = async (values: AdjustValues) => {
    try {
      await inventoryApi.adjust(productId, values)
      toast.success(`Stock adjusted by ${values.quantity > 0 ? '+' : ''}${values.quantity}`)
      onSaved()
      onClose()
      reset()
    } catch (err) {
      const apiErr = toApiError(err)
      apiErr.fieldErrors.forEach((f) => setError(f.field as keyof AdjustValues, { type: 'server', message: f.message }))
      toast.error(apiErr.message)
    }
  }

  const resulting = availableStock + (Number(quantity) || 0)

  return (
    <Modal open={open} onClose={onClose} title="Adjust stock" description="Corrections are recorded in the movement history." size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Quantity (use negative to reduce)" htmlFor="adj-qty" error={errors.quantity?.message} required>
          <Input id="adj-qty" type="number" placeholder="-2 or 5" invalid={Boolean(errors.quantity)} {...register('quantity')} />
        </FormField>
        <FormField label="Reason" htmlFor="adj-reason" error={errors.reason?.message} required>
          <Select id="adj-reason" invalid={Boolean(errors.reason)} {...register('reason')}>
            <option value="">Select reason…</option>
            <option value="DAMAGED">Damaged</option>
            <option value="CYCLE_COUNT">Cycle count correction</option>
            <option value="SUPPLIER_RETURN">Supplier return</option>
            <option value="FOUND">Found / recount</option>
            <option value="OTHER">Other</option>
          </Select>
        </FormField>
        <FormField label="Note" htmlFor="adj-note" error={errors.note?.message}>
          <Input id="adj-note" placeholder="Optional context" {...register('note')} />
        </FormField>
        {Number(quantity) !== 0 && (
          <p className={`text-sm ${resulting < 0 ? 'text-status-red' : 'text-shade-50'}`} aria-live="polite">
            Resulting available stock: <strong>{resulting}</strong>
            {resulting < 0 && ' — stock cannot become negative'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Apply adjustment</Button>
        </div>
      </form>
    </Modal>
  )
}

const movementColumns: Column<InventoryMovement>[] = [
  {
    key: 'createdAt',
    header: 'When',
    render: (m) => <span className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    render: (m) => <Tag>{humanize(m.type)}</Tag>,
  },
  {
    key: 'quantity',
    header: 'Qty',
    render: (m) => (
      <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${m.quantity >= 0 ? 'text-status-green' : 'text-status-red'}`}>
        {m.quantity >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
      </span>
    ),
  },
  { key: 'reason', header: 'Reason', render: (m) => m.reason ?? '—' },
  { key: 'toBin', header: 'Bin', render: (m) => <span className="font-mono text-xs">{m.toBin ?? m.fromBin ?? '—'}</span> },
  { key: 'createdBy', header: 'By', render: (m) => m.createdBy },
]

export default function InventoryDetailPage() {
  const { productId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const canWrite = can(role, 'Inventory', 'update')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [movementsPage, setMovementsPage] = useState(0)

  const detail = useApi<InventoryDetail>(() => inventoryApi.detail(productId), [productId])
  const movements = useApi(() => inventoryApi.movements(productId, { page: movementsPage, size: 10 }), [productId, movementsPage])

  if (detail.loading) return <PageLoader />
  if (detail.errorStatus === 404) return <NotFoundState />
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.refetch} />
  const inv = detail.data
  if (!inv) return null

  const stockRows = [
    { label: 'On hand', value: inv.physicalStock, tone: 'text-ink' },
    { label: 'Reserved', value: inv.reservedStock, tone: 'text-status-amber' },
    { label: 'Available', value: inv.availableStock, tone: inv.availableStock <= inv.minimumStock ? 'text-status-red' : 'text-status-green' },
    { label: 'Damaged', value: inv.damagedStock, tone: 'text-status-red' },
    { label: 'Incoming', value: inv.incomingStock, tone: 'text-status-green' },
    { label: 'Minimum', value: inv.minimumStock, tone: 'text-shade-50' },
  ]

  return (
    <div>
      <PageHeader
        title={inv.name}
        description={`${inv.sku} · ${inv.warehouseName ?? 'Unassigned warehouse'} · bin ${inv.binCode ?? '—'}`}
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: inv.sku }]}
        actions={
          <>
            <Link to="/inventory" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Link>
            {canWrite && (
              <Button onClick={() => setAdjustOpen(true)}>Adjust stock</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stockRows.map((row) => (
          <Card key={row.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-shade-40">{row.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${row.tone}`}>{row.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Status" />
          <div className="space-y-4 p-5">
            <StockIndicator available={inv.availableStock} minimum={inv.minimumStock} />
            <p className="text-sm text-shade-50">
              Available = physical − reserved − damaged (business rule, section 26 of the API contract).
            </p>
            {inv.reservations.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Open reservations</p>
                <ul className="space-y-2">
                  {inv.reservations.map((res) => (
                    <li key={res.id} className="flex items-center justify-between rounded-lg bg-shade-30/20 px-3 py-2 text-sm">
                      <Link to={`/orders/${res.orderId}`} className="font-medium underline">
                        {res.orderNumber}
                      </Link>
                      <span className="tabular-nums text-shade-50">{res.quantity} reserved</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Movement history"
            subtitle="Every stock change is auditable"
            actions={<History className="h-4 w-4 text-shade-40" aria-hidden />}
          />
          <DataTable
            columns={movementColumns}
            rows={movements.data?.content ?? []}
            rowKey={(m) => m.id}
            loading={movements.loading}
            error={movements.error}
            onRetry={movements.refetch}
            emptyTitle="No movements recorded"
          />
          <Pagination
            page={movements.data?.page ?? 0}
            totalPages={movements.data?.totalPages ?? 1}
            totalElements={movements.data?.totalElements ?? 0}
            size={movements.data?.size ?? 10}
            onPageChange={setMovementsPage}
          />
        </Card>
      </div>

      <AdjustStockModal
        productId={productId}
        availableStock={inv.availableStock}
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onSaved={() => {
          detail.refetch()
          movements.refetch()
        }}
      />
    </div>
  )
}
