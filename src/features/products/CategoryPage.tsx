import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Category } from '@/types/api'
import { categoryApi } from '@/api/productApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button, Card, FormField, Input, Textarea } from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'

const categorySchema = z.object({
  name: z.string().min(2, 'Name is required').max(60, 'Name is too long'),
  description: z.string().max(300, 'Description is too long').optional(),
})

type CategoryValues = z.infer<typeof categorySchema>

export default function CategoryPage() {
  const role = useAuthStore((s) => s.user?.role)
  const writable = can(role, 'Products', 'update')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const categories = useApi(() => categoryApi.list(), [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema) })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', description: '' })
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    reset({ name: cat.name, description: cat.description })
    setModalOpen(true)
  }

  const onSubmit = async (values: CategoryValues) => {
    try {
      if (editing) {
        await categoryApi.update(editing.id, values)
        toast.success('Category updated')
      } else {
        await categoryApi.create(values)
        toast.success('Category created')
      }
      setModalOpen(false)
      categories.refetch()
    } catch (err) {
      const apiErr = toApiError(err)
      apiErr.fieldErrors.forEach((f) => setError(f.field as keyof CategoryValues, { type: 'server', message: f.message }))
      toast.error(apiErr.message)
    }
  }

  const onDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"? Categories with products cannot be deleted.`)) return
    try {
      await categoryApi.remove(cat.id)
      toast.success('Category deleted')
      categories.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Category', sortable: true, render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: 'description', header: 'Description', render: (c) => c.description ?? '—' },
    { key: 'productCount', header: 'Products', render: (c) => <span className="tabular-nums">{c.productCount}</span> },
    ...(writable
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (c: Category) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-status-red" onClick={() => onDelete(c)}>Delete</Button>
              </div>
            ),
          } satisfies Column<Category>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Product groupings used across the catalog, inventory and analytics."
        actions={
          <PermissionGate module="Products" min="update">
            <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={openCreate}>
              New category
            </Button>
          </PermissionGate>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          rows={categories.data?.data ?? []}
          rowKey={(c) => c.id}
          loading={categories.loading}
          error={categories.error}
          onRetry={categories.refetch}
          emptyTitle="No categories yet"
          emptyDescription="Create categories like Bracelets, Necklaces or Home Decoration."
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        description="Categories can be assigned to products from the product form."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Name" htmlFor="cat-name" error={errors.name?.message} required>
            <Input id="cat-name" invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField label="Description" htmlFor="cat-desc" error={errors.description?.message}>
            <Textarea id="cat-desc" rows={2} {...register('description')} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
