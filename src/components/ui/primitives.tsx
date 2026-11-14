import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { humanize, type BadgeTone } from '@/utils/date'

/* -------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'outline' | 'aloe' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-shade-70 disabled:bg-shade-40',
  outline: 'bg-white text-ink border border-ink hover:bg-shade-30/30 disabled:text-shade-40 disabled:border-shade-30',
  aloe: 'bg-aloe text-ink hover:brightness-95 disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-shade-30/40 disabled:text-shade-40',
  danger: 'bg-status-red text-white hover:brightness-110 disabled:opacity-50',
}

/** Pill button — the only button shape in the system (DESIGN-shopify.md). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed ${
        size === 'sm' ? 'px-3.5 py-1.5 text-sm' : 'px-6 py-2.5 text-[15px]'
      } ${buttonVariants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

/** Square-ish icon button with a required accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-shade-30/40 disabled:cursor-not-allowed disabled:text-shade-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

/* --------------------------------- Inputs --------------------------------- */

const inputBase =
  'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-[15px] text-ink placeholder:text-shade-40 focus:border-ink focus:outline-none disabled:bg-shade-30/20 disabled:text-shade-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = '', invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${inputBase} min-h-[44px] ${invalid ? 'border-status-red' : ''} ${className}`}
        {...rest}
      />
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className = '', invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${inputBase} ${invalid ? 'border-status-red' : ''} ${className}`}
        {...rest}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className = '', invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${inputBase} min-h-[44px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2352525b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-9 ${invalid ? 'border-status-red' : ''} ${className}`}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

/** Label + control + error message with proper a11y wiring. */
export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-status-red" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-shade-50">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-status-red" role="alert">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

/* --------------------------------- Badges --------------------------------- */

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-status-green-bg text-status-green',
  amber: 'bg-status-amber-bg text-status-amber',
  red: 'bg-status-red-bg text-status-red',
  slate: 'bg-status-slate-bg text-status-slate',
  aloe: 'bg-aloe text-ink',
}

export function Badge({ tone = 'slate', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, tone = 'slate' }: { status: string; tone?: BadgeTone }) {
  return <Badge tone={tone}>{humanize(status)}</Badge>
}

/** Small neutral pill tag (pill-tag-shade vocabulary). */
export function Tag({ children, tone = 'shade' }: { children: ReactNode; tone?: 'shade' | 'mint' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        tone === 'mint' ? 'bg-aloe text-ink' : 'bg-shade-30/60 text-ink'
      }`}
    >
      {children}
    </span>
  )
}

/* ---------------------------------- Card ----------------------------------- */

export function Card({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-hairline bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-shade-50">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

/* ---------------------------------- KPI ------------------------------------ */

interface KpiCardProps {
  label: string
  value: string
  sublabel?: string
  trend?: number
  icon?: ReactNode
  accent?: boolean
}

export function KpiCard({ label, value, sublabel, trend, icon, accent }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${
        accent ? 'bg-aloe' : 'border border-hairline bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${accent ? 'text-ink/80' : 'text-shade-50'}`}>{label}</p>
        {icon && <span className={accent ? 'text-ink/70' : 'text-shade-40'}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-status-green' : 'text-status-red'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sublabel && <span className={`text-xs ${accent ? 'text-ink/70' : 'text-shade-40'}`}>{sublabel}</span>}
      </div>
    </div>
  )
}

/* ------------------------------- States ------------------------------------ */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-shade-30/50 ${className}`} aria-hidden />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-shade-50" aria-hidden />
      <p className="text-sm text-shade-50">{label}</p>
    </div>
  )
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-shade-30">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-shade-50">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center" role="alert">
      <AlertCircle className="h-8 w-8 text-status-red" aria-hidden />
      <p className="font-medium text-ink">Something went wrong</p>
      <p className="max-w-md text-sm text-shade-50">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function ForbiddenState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      <AlertCircle className="h-10 w-10 text-status-amber" aria-hidden />
      <h1 className="text-lg font-semibold text-ink">Permission required</h1>
      <p className="max-w-md text-sm text-shade-50">
        You do not have permission to view this area. Contact an owner or manager if you believe this is a mistake.
      </p>
    </div>
  )
}

export function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      <AlertCircle className="h-10 w-10 text-shade-30" aria-hidden />
      <h1 className="text-lg font-semibold text-ink">Not found</h1>
      <p className="text-sm text-shade-50">The record you are looking for does not exist or was removed.</p>
    </div>
  )
}

export function InlineSuccess({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-status-green">
      <CheckCircle2 className="h-4 w-4" aria-hidden />
      {children}
    </p>
  )
}

/* ---------------------------------- Tabs ----------------------------------- */

interface Tab {
  id: string
  label: string
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-shade-30/30 p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === tab.id ? 'bg-ink text-white' : 'text-shade-60 hover:text-ink'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ Stock indicator ----------------------------- */

export function StockIndicator({ available, minimum }: { available: number; minimum: number }) {
  const tone: BadgeTone = available === 0 ? 'red' : available <= minimum ? 'amber' : 'green'
  const label = available === 0 ? 'Out of stock' : available <= minimum ? 'Low stock' : 'In stock'
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${available === 0 ? 'bg-status-red' : available <= minimum ? 'bg-status-amber' : 'bg-status-green'}`} aria-hidden />
      <span className="tabular-nums">{available}</span>
      <Badge tone={tone}>{label}</Badge>
    </div>
  )
}
