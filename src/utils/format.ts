const CURRENCY_CODE = (import.meta.env.VITE_CURRENCY_CODE as string | undefined) ?? 'INR'
const CURRENCY_LOCALE = CURRENCY_CODE === 'INR' ? 'en-IN' : 'en-US'

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  maximumFractionDigits: 0,
})

const currencyFormatterPrecise = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return currencyFormatter.format(value)
}

export function formatCurrencyPrecise(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return currencyFormatterPrecise.format(value)
}

export function formatCurrencyCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return compactFormatter.format(value)
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(CURRENCY_LOCALE).format(value)
}

export function formatPercent(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return `${value >= 0 ? '' : ''}${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}
