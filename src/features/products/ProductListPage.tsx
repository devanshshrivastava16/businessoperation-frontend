import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Package, Plus } from 'lucide-react'
import type { Category, Product, ProductStatus } from '@/types/api'
import { categoryApi, productApi } from '@/api/productApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/Modal'
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  StatusBadge,
  StockIndicator,
  Textarea,
} from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { formatCurrency } from '@/utils/format'
import { humanize, productStatusTone } from '@/utils/date'

/* ------------------------------ Product form ------------------------------- */

const productSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(32, 'SKU is too long'),
  name: z.string().min(2, 'Name is required'),
  categoryId: z.string().min(1, 'Select a category'),
  description: z.string().max(2000, 'Description is too long').optional(),
  sellingPrice: z.coerce.number({ invalid_type_error: 'Selling price must be a number' }).positive('Must be greater than 0'),
  costPrice: z.coerce.number({ invalid_type_error: 'Cost price must be a number' }).positive('Must be greater than 0'),
  taxRate: z.coerce.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100').optional(),
  weightGrams: z.coerce.number().int('Must be a whole number').positive('Must be positive').optional(),
  minimumStock: z.coerce.number({ invalid_type_error: 'Minimum stock is required' }).int().min(0, 'Cannot be negative'),
  barcode: z.string().max(64).optional(),
  supplierId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
})

type ProductFormValues = z.input<typeof productSchema>

function ProductForm({
  product,
  categories,
  onSaved,
  onClose,
}: {
  product: Product | null
  categories: Category[]
  onSaved: () => void
  onClose: () => void
}) {
  const isEdit = Boolean(product)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          categoryId: product.categoryId,
          description: product.description,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          taxRate: product.taxRate,
          weightGrams: product.weightGrams,
          minimumStock: product.minimumStock,
          barcode: product.barcode,
          status: product.status,
        }
      : { minimumStock: 10 },
  })

  const onSubmit = async (values: ProductFormValues) => {
    const parsed = productSchema.parse(values)
    try {
      if (isEdit && product) {
        await productApi.update(product.id, parsed)
        toast.success('Product updated')
      } else {
        await productApi.create(parsed)
        toast.success('Product created')
      }
      onSaved()
      onClose()
    } catch (err) {
      const apiErr = toApiError(err)
      if (apiErr.fieldErrors.length > 0) {
        apiErr.fieldErrors.forEach((f) => {
          setError(f.field as keyof ProductFormValues, { type: 'server', message: f.message })
        })
      }
      toast.error(apiErr.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="SKU" htmlFor="pf-sku" error={errors.sku?.message} required>
          <Input id="pf-sku" invalid={Boolean(errors.sku)} disabled={isEdit} {...register('sku')} />
        </FormField>
        <FormField label="Barcode" htmlFor="pf-barcode" error={errors.barcode?.message}>
          <Input id="pf-barcode" invalid={Boolean(errors.barcode)} {...register('barcode')} />
        </FormField>
      </div>
      <FormField label="Name" htmlFor="pf-name" error={errors.name?.message} required>
        <Input id="pf-name" invalid={Boolean(errors.name)} {...register('name')} />
      </FormField>
      <FormField label="Category" htmlFor="pf-category" error={errors.categoryId?.message} required>
        <Select id="pf-category" invalid={Boolean(errors.categoryId)} {...register('categoryId')}>
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Selling price" htmlFor="pf-price" error={errors.sellingPrice?.message} required>
          <Input id="pf-price" type="number" step="0.01" invalid={Boolean(errors.sellingPrice)} {...register('sellingPrice')} />
        </FormField>
        <FormField label="Cost price" htmlFor="pf-cost" error={errors.costPrice?.message} required>
          <Input id="pf-cost" type="number" step="0.01" invalid={Boolean(errors.costPrice)} {...register('costPrice')} />
        </FormField>
        <FormField label="Tax rate %" htmlFor="pf-tax" error={errors.taxRate?.message}>
          <Input id="pf-tax" type="number" step="0.1" invalid={Boolean(errors.taxRate)} {...register('taxRate')} />
        </FormField>
        <FormField label="Weight (grams)" htmlFor="pf-weight" error={errors.weightGrams?.message}>
          <Input id="pf-weight" type="number" invalid={Boolean(errors.weightGrams)} {...register('weightGrams')} />
        </FormField>
        <FormField label="Minimum stock" htmlFor="pf-minstock" error={errors.minimumStock?.message} required>
          <Input id="pf-minstock" type="number" invalid={Boolean(errors.minimumStock)} {...register('minimumStock')} />
        </FormField>
        {isEdit && (
          <FormField label="Status" htmlFor="pf-status" error={errors.status?.message}>
            <Select id="pf-status" {...register('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </FormField>
        )}
      </div>
      <FormField label="Description" htmlFor="pf-desc" error={errors.description?.message}>
        <Textarea id="pf-desc" rows={3} {...register('description')} />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  )
}

/* ------------------------------ Product list ------------------------------- */

export default function ProductListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Products', 'update')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const categories = useApi(() => categoryApi.list(), [])
  const list = usePagedList<Product>((query) => productApi.list(query as never))
  const statusFilter = list.filters.status as ProductStatus | undefined

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.data?.data.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories.data])

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await productApi.remove(deleting.id)
      toast.success('Product deactivated (soft delete)')
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setDeleting(null)
    }
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <Link to={`/products/${p.id}`} className="font-medium text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
            {p.name}
          </Link>
          <p className="text-xs text-shade-40">{p.sku}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p) => categoryMap.get(p.categoryId) ?? p.category },
    {
      key: 'sellingPrice',
      header: 'Price',
      sortable: true,
      render: (p) => (
        <div>
          <p className="tabular-nums">{formatCurrency(p.sellingPrice)}</p>
          <p className="text-xs text-shade-40">cost {formatCurrency(p.costPrice)}</p>
        </div>
      ),
    },
    {
      key: 'availableStock',
      header: 'Stock',
      sortable: true,
      render: (p) => <StockIndicator available={p.availableStock} minimum={p.minimumStock} />,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} tone={productStatusTone(p.status)} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) =>
        writable ? (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setFormOpen(true) }}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="text-status-red" onClick={() => setDeleting(p)}>
              Deactivate
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog synced from Shopify plus internal products. Prices in store currency."
        actions={
          <PermissionGate module="Products" min="update">
            <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => { setEditing(null); setFormOpen(true) }}>
              New product
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or SKU…" className="w-full sm:w-80" />
          <Select
            aria-label="Filter by status"
            value={statusFilter ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </Select>
          <Select
            aria-label="Filter by category"
            value={(list.filters.categoryId as string) ?? ''}
            onChange={(e) => list.setFilter('categoryId', e.target.value || undefined)}
            className="w-48"
          >
            <option value="">All categories</option>
            {categories.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(p) => p.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No products found"
          emptyDescription="Adjust the filters or create your first product."
          emptyAction={
            writable ? (
              <Button variant="outline" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => { setEditing(null); setFormOpen(true) }}>
                New product
              </Button>
            ) : undefined
          }
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(p) => navigate(`/products/${p.id}`)}
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
        title={editing ? 'Edit product' : 'New product'}
        description={editing ? editing.sku : 'Create an internal catalog entry'}
        wide
      >
        {categories.data && (
          <ProductForm product={editing} categories={categories.data.data} onSaved={list.refetch} onClose={() => setFormOpen(false)} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Deactivate product"
        message={`"${deleting?.name}" will be deactivated (soft delete). Historic orders keep their data.`}
        confirmLabel="Deactivate"
        destructive
      />

      <p className="mt-4 flex items-center gap-2 text-xs text-shade-40">
        <Package className="h-3.5 w-3.5" aria-hidden />
        {list.totalElements} products · {humanize('soft_delete_preferred')}
      </p>
      <Badge tone="aloe" className="hidden">
        spacer
      </Badge>
    </div>
  )
}
