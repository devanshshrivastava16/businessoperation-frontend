import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-shade-50">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-shade-30" aria-hidden />}
            {item.to && !last ? (
              <Link to={item.to} className="hover:text-ink hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-ink' : ''}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <div className="mb-2">{<Breadcrumbs items={breadcrumbs} />}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-shade-50">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
