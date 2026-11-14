import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, TableSkeleton } from './primitives'

/* ------------------------------- DataTable -------------------------------- */

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  sort?: string | null
  onSortChange?: (sort: string | null) => void
  onRowClick?: (row: T) => void
}

/**
 * Generic table with loading / error / empty states and optional sorting.
 * Scrolls horizontally on small screens so data never becomes unusable.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  sort,
  onSortChange,
  onRowClick,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton rows={6} />
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  }

  const toggleSort = (key: string) => {
    if (!onSortChange) return
    if (sort === `${key},asc`) onSortChange(`${key},desc`)
    else if (sort === `${key},desc`) onSortChange(null)
    else onSortChange(`${key},asc`)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs uppercase tracking-wide text-shade-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={sort?.startsWith(`${col.key},`) ? (sort.endsWith('desc') ? 'descending' : 'ascending') : undefined}
                className={`px-5 py-3 font-medium ${col.className ?? ''}`}
              >
                {col.sortable && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    {col.header}
                    {sort === `${col.key},asc` && <ArrowUp className="h-3 w-3" aria-hidden />}
                    {sort === `${col.key},desc` && <ArrowDown className="h-3 w-3" aria-hidden />}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-hairline/70 transition-colors last:border-0 hover:bg-shade-30/20 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-5 py-3.5 text-shade-70 ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------- Pagination -------------------------------- */

interface PaginationProps {
  page: number
  totalPages: number
  totalElements: number
  size: number
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
}

export function Pagination({ page, totalPages, totalElements, size, onPageChange, onSizeChange }: PaginationProps) {
  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min(totalElements, (page + 1) * size)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm text-shade-50">
      <p aria-live="polite">
        Showing <span className="font-medium text-ink">{from}</span>–<span className="font-medium text-ink">{to}</span> of{' '}
        <span className="font-medium text-ink">{totalElements}</span>
      </p>
      <div className="flex items-center gap-2">
        {onSizeChange && (
          <label className="flex items-center gap-1.5 text-xs">
            Per page
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="rounded-md border border-hairline bg-white px-2 py-1 text-xs"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-[72px] text-center text-xs">
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1 || totalElements === 0}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------- SearchInput ------------------------------- */

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-shade-40" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-[44px] w-full rounded-full border border-hairline bg-white pl-9 pr-9 text-[15px] placeholder:text-shade-40 focus:border-ink focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-shade-40 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

/* ------------------------------ DateRangePicker ----------------------------- */

interface DateRangePickerProps {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  presets?: { label: string; days: number }[]
}

export function DateRangePicker({ from, to, onChange, presets = [] }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => {
        const active =
          from === daysAgoLocal(preset.days) && to === daysAgoLocal(0)
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange({ from: daysAgoLocal(preset.days), to: daysAgoLocal(0) })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? 'bg-ink text-white' : 'bg-white text-shade-60 ring-1 ring-hairline hover:text-ink'
            }`}
          >
            {preset.label}
          </button>
        )
      })}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from ?? ''}
          max={to}
          onChange={(e) => onChange({ from: e.target.value || undefined, to })}
          aria-label="From date"
          className="min-h-[36px] rounded-lg border border-hairline bg-white px-2 text-sm"
        />
        <span className="text-shade-40" aria-hidden>
          –
        </span>
        <input
          type="date"
          value={to ?? ''}
          min={from}
          onChange={(e) => onChange({ from, to: e.target.value || undefined })}
          aria-label="To date"
          className="min-h-[36px] rounded-lg border border-hairline bg-white px-2 text-sm"
        />
      </div>
    </div>
  )
}

function daysAgoLocal(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
