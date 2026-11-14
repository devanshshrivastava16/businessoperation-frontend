import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import type { Role, User } from '@/types/api'
import { userApi } from '@/api/userApi'
import { toApiError } from '@/api/axiosInstance'
import { usePagedList } from '@/hooks/usePagedList'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, SearchInput, type Column } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge, Button, Card, FormField, Input, Select, Tag } from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { can, ROLES } from '@/utils/permissions'
import { humanize } from '@/utils/date'

const createUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['OWNER', 'MANAGER', 'WAREHOUSE_STAFF', 'PURCHASING', 'ACCOUNTANT']),
})

type CreateUserValues = z.infer<typeof createUserSchema>

const roleTone: Record<Role, 'aloe' | 'slate' | 'amber' | 'green' | 'red'> = {
  OWNER: 'aloe',
  MANAGER: 'green',
  WAREHOUSE_STAFF: 'slate',
  PURCHASING: 'amber',
  ACCOUNTANT: 'red',
}

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema), defaultValues: { role: 'WAREHOUSE_STAFF' } })

  const onSubmit = async (values: CreateUserValues) => {
    try {
      await userApi.create(values)
      toast.success('User created — they can sign in immediately')
      reset()
      onCreated()
      onClose()
    } catch (err) {
      const apiErr = toApiError(err)
      apiErr.fieldErrors.forEach((f) => setError(f.field as keyof CreateUserValues, { type: 'server', message: f.message }))
      toast.error(apiErr.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create user" description="Users sign in with email + password; roles drive authorization." size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Full name" htmlFor="nu-name" error={errors.name?.message} required>
          <Input id="nu-name" invalid={Boolean(errors.name)} {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="nu-email" error={errors.email?.message} required>
          <Input id="nu-email" type="email" invalid={Boolean(errors.email)} {...register('email')} />
        </FormField>
        <FormField label="Temporary password" htmlFor="nu-pass" error={errors.password?.message} required hint="Minimum 8 characters. The user should change it after first sign-in.">
          <Input id="nu-pass" type="password" invalid={Boolean(errors.password)} {...register('password')} />
        </FormField>
        <FormField label="Role" htmlFor="nu-role" error={errors.role?.message} required>
          <Select id="nu-role" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create user</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UsersPage() {
  const role = useAuthStore((s) => s.user?.role)
  const fullAccess = can(role, 'Users', 'full')
  const [createOpen, setCreateOpen] = useState(false)
  const list = usePagedList<User>((query) => userApi.list(query as never))

  const toggleActive = async (u: User) => {
    try {
      await userApi.setStatus(u.id, { active: !(u.active ?? true) })
      toast.success(`${u.name} ${(u.active ?? true) ? 'deactivated' : 'activated'}`)
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const changeRole = async (u: User, newRole: Role) => {
    try {
      await userApi.update(u.id, { role: newRole })
      toast.success(`${u.name} is now ${humanize(newRole)}`)
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{u.name}</p>
            <p className="truncate text-xs text-shade-40">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        fullAccess ? (
          <Select
            aria-label={`Role for ${u.name}`}
            value={u.role}
            onChange={(e) => changeRole(u, e.target.value as Role)}
            className="w-44"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={roleTone[u.role]}>{humanize(u.role)}</Badge>
        ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (u) => (
        <Badge tone={(u.active ?? true) ? 'green' : 'red'}>{(u.active ?? true) ? 'Active' : 'Disabled'}</Badge>
      ),
    },
    ...(fullAccess
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (u: User) => (
              <Button
                size="sm"
                variant="ghost"
                className={(u.active ?? true) ? 'text-status-red' : ''}
                onClick={() => toggleActive(u)}
              >
                {(u.active ?? true) ? 'Deactivate' : 'Activate'}
              </Button>
            ),
          } satisfies Column<User>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Team members and their roles. The backend enforces authorization; the UI only mirrors it."
        actions={
          <PermissionGate module="Users" min="full">
            <Button icon={<UserPlus className="h-4 w-4" aria-hidden />} onClick={() => setCreateOpen(true)}>
              New user
            </Button>
          </PermissionGate>
        }
      />
      <Card>
        <div className="border-b border-hairline p-4">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or email…" className="w-full sm:w-80" />
        </div>
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(u) => u.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No users"
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

      <p className="mt-4 text-xs text-shade-40">
        Roles: <Tag>OWNER</Tag> <Tag>MANAGER</Tag> <Tag>WAREHOUSE_STAFF</Tag> <Tag>PURCHASING</Tag> <Tag>ACCOUNTANT</Tag>
      </p>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={list.refetch} />
    </div>
  )
}
