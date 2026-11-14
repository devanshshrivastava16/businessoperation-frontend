import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Link2, RefreshCw, Store, TriangleAlert, XCircle } from 'lucide-react'
import type { ShopifyIntegration, SyncLog } from '@/types/api'
import { shopifyApi } from '@/api/shopifyApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, Button, Card, CardHeader, ErrorState, Tag } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/Modal'
import { formatDateTime, humanize, relativeTime } from '@/utils/date'

function SyncBadge({ status }: { status: 'IDLE' | 'RUNNING' | 'FAILED' }) {
  if (status === 'FAILED') return <Badge tone="red">Failed</Badge>
  if (status === 'RUNNING') return <Badge tone="amber">Running</Badge>
  return <Badge tone="green">Idle</Badge>
}

export default function ShopifyPage() {
  const [confirmFullSync, setConfirmFullSync] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const status = useApi<ShopifyIntegration>(() => shopifyApi.status(), [])
  const logs = useApi(() => shopifyApi.syncLogs(), [])

  const runSync = async (kind: 'products' | 'orders' | 'inventory' | 'customers' | 'full') => {
    setBusy(kind)
    try {
      const result =
        kind === 'full'
          ? await shopifyApi.syncFull()
          : kind === 'products'
            ? await shopifyApi.syncProducts()
            : kind === 'orders'
              ? await shopifyApi.syncOrders()
              : kind === 'inventory'
                ? await shopifyApi.syncInventory()
                : await shopifyApi.syncCustomers()
      toast.success(result.message)
      status.refetch()
      logs.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const connect = async () => {
    setBusy('connect')
    try {
      await shopifyApi.connect()
      toast.success('Shopify connection flow started')
      status.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  if (status.loading) return <p className="py-16 text-center text-sm text-shade-50">Loading integration status…</p>
  if (status.error) return <ErrorState message={status.error} onRetry={status.refetch} />
  const integration = status.data

  return (
    <div>
      <PageHeader
        title="Shopify Integration"
        description="Connection status, synchronization controls and sync logs. Access tokens stay on the backend — they are never shown in this UI."
        actions={
          integration?.connected ? (
            <Button variant="outline" icon={<RefreshCw className="h-4 w-4" aria-hidden />} loading={busy === 'full'} onClick={() => setConfirmFullSync(true)}>
              Run full sync
            </Button>
          ) : (
            <Button icon={<Link2 className="h-4 w-4" aria-hidden />} loading={busy === 'connect'} onClick={connect}>
              Connect store
            </Button>
          )
        }
      />

      {integration && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader
              title="Connection"
              actions={<Badge tone={integration.connected ? 'green' : 'red'}>{integration.connected ? 'Connected' : 'Disconnected'}</Badge>}
            />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-2">
                <Store className="h-4 w-4 text-shade-40" aria-hidden />
                <span className="font-medium">{integration.storeName}</span>
              </p>
              <p className="font-mono text-xs text-shade-50">{integration.shopDomain}</p>
              {integration.connectedAt && <p className="text-xs text-shade-40">Connected {relativeTime(integration.connectedAt)}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {integration.scopes.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
              <p className="rounded-lg bg-shade-30/20 p-3 text-xs leading-relaxed text-shade-50">
                Webhooks for orders, products, inventory, customers and refunds are received and validated by the backend.
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Synchronization" subtitle="Trigger targeted syncs; results appear in the log below" />
            <ul className="divide-y divide-hairline">
              {(['products', 'orders', 'inventory', 'customers'] as const).map((key) => {
                const sync = integration.sync[key]
                return (
                  <li key={key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{humanize(key)} sync</p>
                      <p className="text-xs text-shade-40">
                        {sync.lastSyncAt ? `Last synced ${relativeTime(sync.lastSyncAt)}` : 'Never synced'}
                        {sync.lastError ? ` — ${sync.lastError}` : ''}
                      </p>
                    </div>
                    <SyncBadge status={sync.status} />
                    {sync.status === 'FAILED' ? (
                      <TriangleAlert className="h-4 w-4 text-status-red" aria-label="Last sync failed" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-status-green" aria-label="Sync healthy" />
                    )}
                    <Button size="sm" variant="outline" loading={busy === key} onClick={() => runSync(key)}>
                      Sync now
                    </Button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader title="Sync logs" subtitle="Most recent synchronization activity, including failures" />
        <ul className="divide-y divide-hairline">
          {logs.data?.data.map((log: SyncLog) => (
            <li key={log.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
              {log.status === 'SUCCESS' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-green" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-status-red" aria-hidden />
              )}
              <Tag>{log.type}</Tag>
              <span className="min-w-0 flex-1">{log.message}</span>
              <span className="text-xs tabular-nums text-shade-40">{log.recordsProcessed} records</span>
              <span className="text-xs text-shade-40">{formatDateTime(log.createdAt)}</span>
            </li>
          ))}
          {logs.data?.data.length === 0 && <li className="px-5 py-8 text-center text-sm text-shade-50">No sync activity yet.</li>}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmFullSync}
        onClose={() => setConfirmFullSync(false)}
        onConfirm={() => {
          setConfirmFullSync(false)
          void runSync('full')
        }}
        title="Run full sync"
        message="A full sync re-imports products, orders, inventory and customers from Shopify. It may take several minutes and counts against Shopify API limits."
        confirmLabel="Start full sync"
      />
    </div>
  )
}
