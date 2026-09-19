import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'

/** Lỗi API không gắn được vào field cụ thể (`root.server`). */
export function FormRootError<T extends FieldValues>({ form }: { form: UseFormReturn<T> }) {
  const errors = form.formState.errors as { root?: Record<string, { message?: string }> }
  const message = errors.root?.server?.message
  if (!message) return null
  return (
    <div
      role="alert"
      className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md px-3 py-2 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}
