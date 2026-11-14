import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Card, CardHeader, Tag } from '@/components/ui/primitives'
import { PermissionGate } from '@/components/PermissionGate'
import { humanize } from '@/utils/date'

/**
 * Settings — account + environment info. Deliberately minimal: the app has
 * no client-side secrets, so there is nothing sensitive to configure here.
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <PageHeader title="Settings" description="Your account and this console's runtime configuration." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your account" />
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-shade-50">Name</dt><dd className="font-medium">{user?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Role</dt><dd><Badge tone="aloe">{humanize(user?.role ?? '')}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-shade-50">Password</dt><dd className="text-shade-50">Managed by the backend — resets go through your administrator.</dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Runtime" subtitle="Read-only environment information" />
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-shade-50">API base URL</dt>
              <dd className="font-mono text-xs">{String(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-shade-50">Mock mode</dt>
              <dd>{import.meta.env.VITE_USE_MOCKS === 'true' ? <Tag tone="mint">Enabled (demo data)</Tag> : <Tag>Disabled</Tag>}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-shade-50">API version</dt>
              <dd className="font-mono text-xs">/api/v1</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-shade-50">Currency</dt>
              <dd className="font-mono text-xs">{String(import.meta.env.VITE_CURRENCY_CODE ?? 'INR')}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <PermissionGate module="Users" min="read">
        <p className="mt-4 text-xs text-shade-40">
          User management, roles and audit logs live in the Administration section of the sidebar.
        </p>
      </PermissionGate>

      <Card className="mt-4">
        <CardHeader title="About this console" />
        <p className="p-5 text-sm leading-relaxed text-shade-60">
          This dashboard is the internal operations interface. Shopify remains the customer-facing storefront; all store
          data flows into this console through the Spring Boot REST API (contract: business-operations-api-documentation.md).
          Health of the backend can be checked at <code className="font-mono text-xs">/actuator/health</code> and the
          OpenAPI schema at <code className="font-mono text-xs">/v3/api-docs</code>.
        </p>
      </Card>
    </div>
  )
}
