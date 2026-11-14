import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Package } from 'lucide-react'
import type { Product, ProductLocation } from '@/types/api'
import { productApi } from '@/api/productApi'
import { inventoryApi } from '@/api/inventoryApi'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, ErrorState, NotFoundState, PageLoader, StatusBadge, StockIndicator, Tag } from '@/components/ui/primitives'
import { formatCurrency, formatCurrencyPrecise } from '@/utils/format'
import { formatDateTime, productStatusTone } from '@/utils/date'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'

export default function ProductDetailPage() {
  const { productId = '' } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const canSeeProfit = can(role, 'Profit', 'limited')
  const product = useApi<Product>(() => productApi.get(productId), [productId])
  const locations = useApi(() => productApi.locations(productId), [productId])
  const inventoryDetail = useApi(() => inventoryApi.detail(productId), [productId])

  if (product.loading) return <PageLoader />
  if (product.errorStatus === 404) return <NotFoundState />
  if (product.error) return <ErrorState message={product.error} onRetry={product.refetch} />
  const p = product.data
  if (!p) return null

  const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0

  return (
    <div>
      <PageHeader
        title={p.name}
        description={p.description}
        breadcrumbs={[
          { label: 'Products', to: '/products' },
          { label: p.sku },
        ]}
        actions={
          <Link to="/products" className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-5 py-2 text-sm font-medium hover:bg-shade-30/30">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to list
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Overview" actions={<StatusBadge status={p.status} tone={productStatusTone(p.status)} />} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">SKU</dt>
              <dd className="mt-0.5 font-medium">{p.sku}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Barcode</dt>
              <dd className="mt-0.5 font-medium">{p.barcode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Category</dt>
              <dd className="mt-0.5 font-medium">{p.category}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Selling price</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{formatCurrencyPrecise(p.sellingPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Cost price</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {canSeeProfit ? formatCurrencyPrecise(p.costPrice) : '•••'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Margin</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {canSeeProfit ? `${margin.toFixed(1)}%` : '•••'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Weight</dt>
              <dd className="mt-0.5 font-medium">{p.weightGrams ? `${p.weightGrams} g` : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Tax rate</dt>
              <dd className="mt-0.5 font-medium">{p.taxRate ?? 0}%</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-shade-40">Created</dt>
              <dd className="mt-0.5 font-medium">{formatDateTime(p.createdAt)}</dd>
            </div>
          </dl>
          {p.variants && p.variants.length > 0 && (
            <div className="border-t border-hairline">
              <CardHeader title="Variants" />
              <ul className="divide-y divide-hairline">
                {p.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-shade-40">
                        {v.sku} · {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-shade-50">
                      <span className="tabular-nums">{formatCurrency(v.price)}</span>
                      <Tag>{v.stock} in stock</Tag>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Stock" actions={<Package className="h-4 w-4 text-shade-40" aria-hidden />} />
            <div className="p-5">
              <StockIndicator available={p.availableStock} minimum={p.minimumStock} />
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-shade-50">Physical</dt><dd className="font-medium tabular-nums">{p.stock}</dd></div>
                <div className="flex justify-between"><dt className="text-shade-50">Available</dt><dd className="font-medium tabular-nums">{p.availableStock}</dd></div>
                <div className="flex justify-between"><dt className="text-shade-50">Minimum</dt><dd className="font-medium tabular-nums">{p.minimumStock}</dd></div>
                {inventoryDetail.data && (
                  <>
                    <div className="flex justify-between"><dt className="text-shade-50">Reserved</dt><dd className="font-medium tabular-nums">{inventoryDetail.data.reservedStock}</dd></div>
                    <div className="flex justify-between"><dt className="text-shade-50">Damaged</dt><dd className="font-medium tabular-nums">{inventoryDetail.data.damagedStock}</dd></div>
                    <div className="flex justify-between"><dt className="text-shade-50">Incoming</dt><dd className="font-medium tabular-nums">{inventoryDetail.data.incomingStock}</dd></div>
                  </>
                )}
              </dl>
              <Link
                to={`/inventory/${p.id}`}
                className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-full border border-ink bg-white text-sm font-medium hover:bg-shade-30/30"
              >
                Manage inventory
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Storage locations" actions={<MapPin className="h-4 w-4 text-shade-40" aria-hidden />} />
            {locations.loading ? (
              <p className="p-5 text-sm text-shade-50">Loading…</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {locations.data?.data.map((loc: ProductLocation) => (
                  <li key={loc.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-mono text-xs">{loc.binCode}</span>
                    <span className="text-shade-50">{loc.warehouseName}</span>
                    <span className="tabular-nums">{loc.quantity}</span>
                  </li>
                ))}
                {locations.data?.data.length === 0 && <li className="px-5 py-4 text-sm text-shade-50">No bin assigned yet.</li>}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
