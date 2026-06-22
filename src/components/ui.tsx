import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'
import { classNames } from '../lib/util'
import { CloseIcon } from './icons'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle'
}) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-500 active:scale-[.98]',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    subtle: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[.98]',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  }[variant]
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    />
  )
}

/** Bottom sheet modal (mobile-native feel). */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="animate-fade absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div className="animate-sheet relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <CloseIcon width={22} height={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-slate-100 px-5 py-3 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[15px] text-slate-900 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20'

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={classNames(inputBase, props.className)} />
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={classNames(inputBase, 'min-h-20 resize-none', props.className)}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classNames(inputBase, props.className)} />
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-bold text-slate-800">{title}</h3>
      <p className="max-w-xs text-sm text-slate-500">{children}</p>
    </div>
  )
}
