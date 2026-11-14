import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Truck } from 'lucide-react'
import type { PaymentTerms, Supplier } from '@/types/api'
import { supplierApi } from '@/api/supplierApi'
import { toApiError } from '@/api/axiosInstance'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Drawer } from '@/components/ui/Drawer'
import { Badge, Button, Card, FormField, Input, Select, Tag } from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { humanize } from '@/utils/date'

const PAYMENT_TERMS: PaymentTerms[] = ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'PREPAID', 'COD']

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  leadTimeDays: z.coerce.number({ invalid_type_error: 'Lead time is required' }).int().min(0, 'Cannot be negative').max(365),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'NET_45', 'NET_60', 'PREPAID', 'COD']),
  address: z.string().optional(),
  notes: z.string().max(500).optional(),
})

type SupplierValues = z.infer<typeof supplierSchema>

function SupplierForm({
  supplier,
  onSaved,
  onClose,
}: {
  supplier: Supplier | null
  onSaved: () => void
  onClose: () => void
}) {
  const isEdit = Boolean(supplier)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          leadTimeDays: supplier.leadTimeDays,
          paymentTerms: supplier.paymentTerms,
          address: supplier.address,
          notes: supplier.notes,
        }
      : { paymentTerms: 'NET_30' },
  })

  const onSubmit = async (values: SupplierValues) => {
    try {
      if (isEdit && supplier) {
        await supplierApi.update(supplier.id, values)
        toast.success('Supplier updated')
      } else {
        await supplierApi.create({ ...values, status: 'ACTIVE' })
        toast.success('Supplier created')
      }
      onSaved()
      onClose()
    } catch (err) {
      const apiErr = toApiError(err)
      apiErr.fieldErrors.forEach((f) => setError(f.field as keyof SupplierValues, { type: 'server', message: f.message }))
      toast.error(apiErr.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Supplier name" htmlFor="sup-name" error={errors.name?.message} required>
        <Input id="sup-name" invalid={Boolean(errors.name)} {...register('name')} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Contact person" htmlFor="sup-contact" error={errors.contactPerson?.message} required>
          <Input id="sup-contact" invalid={Boolean(errors.contactPerson)} {...register('contactPerson')} />
        </FormField>
        <FormField label="Email" htmlFor="sup-email" error={errors.email?.message} required>
          <Input id="sup-email" type="email" invalid={Boolean(errors.email)} {...register('email')} />
        </FormField>
        <FormField label="Phone" htmlFor="sup-phone" error={errors.phone?.message} required>
          <Input id="sup-phone" invalid={Boolean(errors.phone)} {...register('phone')} />
        </FormField>
        <FormField label="Lead time (days)" htmlFor="sup-lead" error={errors.leadTimeDays?.message} required>
          <Input id="sup-lead" type="number" invalid={Boolean(errors.leadTimeDays)} {...register('leadTimeDays')} />
        </FormField>
        <FormField label="Payment terms" htmlFor="sup-terms" error={errors.paymentTerms?.message} required>
          <Select id="sup-terms" {...register('paymentTerms')}>
            {PAYMENT_TERMS.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Address" htmlFor="sup-address" error={errors.address?.message}>
        <Input id="sup-address" {...register('address')} />
      </FormField>
      <FormField label="Notes" htmlFor="sup-notes" error={errors.notes?.message}>
        <Input id="sup-notes" {...register('notes')} />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create supplier'}</Button>
      </div>
    </form>
  )
}

export default function SupplierPage() {
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Suppliers', 'update')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const list = usePagedList<Supplier>((query) => supplierApi.list(query as never))

  const toggleStatus = async (s: Supplier) => {
    try {
      await supplierApi.update(s.id, { status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success(`Supplier ${s.status === 'ACTIVE' ? 'deactivated' : 'activated'}`)
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pistachio text-xs font-semibold">{s.name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{s.name}</p>
            <p className="truncate text-xs text-shade-40">{s.contactPerson}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contact',
      render: (s) => (
        <div className="text-xs">
          <p>{s.email}</p>
          <p className="text-shade-40">{s.phone}</p>
        </div>
      ),
    },
    { key: 'leadTimeDays', header: 'Lead time', sortable: true, render: (s) => <span className="tabular-nums">{s.leadTimeDays} days</span> },
    { key: 'paymentTerms', header: 'Terms', render: (s) => <Tag>{humanize(s.paymentTerms)}</Tag> },
    { key: 'status', header: 'Status', render: (s) => <Badge tone={s.status === 'ACTIVE' ? 'green' : 'red'}>{humanize(s.status)}</Badge> },
    ...(writable
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (s: Supplier) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setFormOpen(true) }}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-status-red" onClick={() => toggleStatus(s)}>
                  {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ),
          } satisfies Column<Supplier>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendor master data used by purchase orders and product sourcing."
        actions={
          <PermissionGate module="Suppliers" min="update">
            <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => { setEditing(null); setFormOpen(true) }}>
              New supplier
            </Button>
          </PermissionGate>
        }
      />
      <Card>
        <div className="border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search supplier, contact or email…" className="w-full sm:w-80" />
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(s) => s.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No suppliers"
          emptyDescription="Add your first supplier to start raising purchase orders."
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

      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit supplier' : 'New supplier'}
        description={editing ? editing.name : 'Vendor details for procurement'}
        wide
      >
        <SupplierForm supplier={editing} onSaved={list.refetch} onClose={() => setFormOpen(false)} />
      </Drawer>

      <p className="mt-4 flex items-center gap-2 text-xs text-shade-40">
        <Truck className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} suppliers
      </p>
    </div>
  )
}
