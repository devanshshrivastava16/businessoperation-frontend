import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { IconButton } from './primitives'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Right-side slide-over panel used for forms and detail views. */
export function Drawer({ open, onClose, title, description, children, footer, wide }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ${
              wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
            }`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-shade-50">{description}</p>}
              </div>
              <IconButton label="Close panel" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
