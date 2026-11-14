import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { IconButton } from './primitives'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Accessible dialog: focus is moved into the dialog, Escape closes it,
 * background scroll is locked, and focus returns to the trigger on close.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    }, 60)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
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
            className={`relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]`}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-shade-50">{description}</p>}
              </div>
              <IconButton label="Close dialog" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
            {children}
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-shade-60">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-5 py-2 text-sm font-medium text-ink hover:bg-shade-30/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            destructive ? 'bg-status-red hover:brightness-110' : 'bg-ink hover:bg-shade-70'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
