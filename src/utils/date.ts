import type { OrderStatus, ProductStatus, PurchaseOrderStatus } from '@/types/api'

/** ISO date (YYYY-MM-DD) for a Date in local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

/** Last N days as an inclusive {from,to} range ending today. */
export function lastNDaysRange(days: number): { from: string; to: string } {
  return { from: daysAgoISO(days), to: todayISO() }
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffMs = then - Date.now()
  const abs = Math.abs(diffMs)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600_000],
    ['month', 30 * 24 * 3600_000],
    ['day', 24 * 3600_000],
    ['hour', 3600_000],
    ['minute', 60_000],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'minute') {
      return rtf.format(Math.round(diffMs / ms), unit)
    }
  }
  return 'just now'
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'slate' | 'aloe'

export function orderStatusTone(status: OrderStatus): BadgeTone {
  switch (status) {
    case 'PENDING':
      return 'amber'
    case 'CONFIRMED':
      return 'slate'
    case 'PICKING':
    case 'PACKING':
      return 'aloe'
    case 'PICKED':
    case 'PACKED':
    case 'READY_TO_SHIP':
      return 'slate'
    case 'SHIPPED':
      return 'aloe'
    case 'DELIVERED':
      return 'green'
    case 'CANCELLED':
      return 'red'
    case 'RETURNED':
      return 'amber'
    default:
      return 'slate'
  }
}

export function poStatusTone(status: PurchaseOrderStatus): BadgeTone {
  switch (status) {
    case 'DRAFT':
      return 'slate'
    case 'SUBMITTED':
      return 'amber'
    case 'APPROVED':
      return 'aloe'
    case 'PARTIALLY_RECEIVED':
      return 'amber'
    case 'RECEIVED':
      return 'green'
    case 'CANCELLED':
      return 'red'
    default:
      return 'slate'
  }
}

export function productStatusTone(status: ProductStatus): BadgeTone {
  switch (status) {
    case 'ACTIVE':
      return 'green'
    case 'INACTIVE':
      return 'red'
    case 'DRAFT':
      return 'slate'
    default:
      return 'slate'
  }
}
