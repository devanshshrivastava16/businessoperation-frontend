import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface DropdownProps {
  trigger: ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  label: string
}

/** Click-outside-aware dropdown menu. Keyboard: Enter/Space opens, Escape closes. */
export function Dropdown({ trigger, children, align = 'right', label }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-2 min-w-[220px] rounded-xl border border-hairline bg-white p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick?: () => void
  children: ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:text-shade-30 ${
        danger ? 'text-status-red hover:bg-status-red-bg' : 'text-ink hover:bg-shade-30/30'
      }`}
    >
      {children}
    </button>
  )
}

/** Inline chevron used inside dropdown triggers. */
export function Chevron() {
  return <ChevronDown className="h-3.5 w-3.5 text-shade-50" aria-hidden />
}
