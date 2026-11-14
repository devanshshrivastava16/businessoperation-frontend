import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import type { Product, Supplier } from '@/types/api'
import { productApi } from '@/api/productApi'
import { purchaseOrderApi } from '@/api/purchaseOrderApi'
import { supplierApi } from '@/api/supplierApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { Button, FormField, Input, Select } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/Drawer'

interface LineItem {
  productId: string
  quantity: number
  unitCost: number
}

/** Create purchase order drawer (contract 13.2). Idempotency-key header can be added by the backend contract if required. */
export function POFormDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  const suppliers = useSuppliers()
  const products = useProducts()

  useEffect(() => {
    if (open) {
      setSupplierId('')
      setExpectedDate('')
      setLines([])
    }
  }, [open])

  const addLine = () => {
    const product = products.data?.content[0]
    setLines((ls) => [
      ...ls,
      { productId: product?.id ?? '', quantity: 50, unitCost: product?.costPrice ?? 0 },
    ])
  }

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)

  const submit = async () => {
    if (!supplierId) {
      toast.error('Select a supplier')
      return
    }
    if (lines.length === 0) {
      toast.error('Add at least one line item')
      return
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0 || l.unitCost <= 0)) {
      toast.error('Every line needs a product, quantity and unit cost')
      return
    }
    setSubmitting(true)
    try {
      await purchaseOrderApi.create({
        supplierId,
        expectedDeliveryDate: expectedDate || undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      })
      toast.success('Purchase order created and submitted for approval')
      onCreated()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New purchase order"
      description="Created as SUBMITTED and routed for approval"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={lines.length === 0}>
            Create purchase order
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Supplier" htmlFor="po-supplier" required>
            <Select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier…</option>
              {(suppliers.data?.content ?? []).map((s: Supplier) => (
                <option key={s.id} value={s.id}>
                  {s.name} · lead {s.leadTimeDays}d
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Expected delivery" htmlFor="po-date">
            <Input id="po-date" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Line items</p>
            <Button size="sm" variant="outline" onClick={addLine}>Add line</Button>
          </div>
          <ul className="space-y-2">
            {lines.map((line, i) => (
              <li key={i} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-hairline p-3">
                <div className="col-span-12 sm:col-span-6">
                  <Select
                    aria-label={`Product for line ${i + 1}`}
                    value={line.productId}
                    onChange={(e) => {
                      const p = products.data?.content.find((x: Product) => x.id === e.target.value)
                      updateLine(i, { productId: e.target.value, unitCost: p?.costPrice ?? line.unitCost })
                    }}
                  >
                    <option value="">Select product…</option>
                    {(products.data?.content ?? []).map((p: Product) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min={1}
                    aria-label={`Quantity for line ${i + 1}`}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label={`Unit cost for line ${i + 1}`}
                    value={line.unitCost}
                    onChange={(e) => updateLine(i, { unitCost: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="col-span-4 flex justify-end sm:col-span-2">
                  <button
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                    className="rounded-full p-2 text-status-red hover:bg-status-red-bg"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {lines.length === 0 && (
              <li className="rounded-xl border border-dashed border-shade-30 px-4 py-8 text-center text-sm text-shade-50">
                No lines yet — add products to restock.
              </li>
            )}
          </ul>
        </div>

        <p className="text-right text-sm">
          Order total: <strong className="tabular-nums">₹{total.toLocaleString('en-IN')}</strong>
        </p>
      </div>
    </Drawer>
  )
}

/* small local fetch helpers with minimal state */

function useSuppliers() {
  return useApi(() => supplierApi.list({ size: 50 }), [])
}

function useProducts() {
  return useApi(() => productApi.list({ size: 100 }), [])
}
