import { cn } from '../../lib/utils'

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50 w-full max-w-lg lg:max-w-xl mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card-bg shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-4', className)} {...props} />
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold text-text-primary', className)} {...props} />
}

export function DialogContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
