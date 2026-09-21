import type { ReactNode } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { FormRootError } from './FormRootError'
import { cn } from '@/lib/utils'

/** Dialog chứa form react-hook-form; dùng cho form ≤ 8 field. */
export function FormDialog<T extends FieldValues, O extends FieldValues = T>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  submitting,
  submitLabel,
  width = 'md',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: UseFormReturn<T, unknown, O>
  onSubmit: (values: O) => void | Promise<unknown>
  submitting?: boolean
  submitLabel?: string
  /** md: 2 cột khi ≥ 4 trường (max 42rem); lg: 2–3 cột (max 64rem); xl: gần full (max 80rem). */
  width?: 'md' | 'lg' | 'xl'
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[92vh] gap-0 p-0',
          width === 'xl' && 'sm:max-w-[min(80rem,calc(100vw-3rem))]',
          width === 'lg' && 'sm:max-w-[min(64rem,calc(100vw-3rem))]',
          width === 'md' && 'sm:max-w-2xl',
        )}
      >
        <DialogHeader className="border-divider border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            noValidate
            className="flex min-h-0 flex-col"
          >
            <div
              className={cn(
                'max-h-[calc(92vh-140px)] overflow-y-auto px-6 py-5',
                // Lưới: textarea/khối con luôn chiếm cả hàng.
                'grid gap-x-5 gap-y-4 [&>[data-slot=form-item]:has(textarea)]:col-span-full [&>[data-slot=form-item]:has([data-slot=table])]:col-span-full',
                width === 'md' && '[&:has(>:nth-child(4))]:sm:grid-cols-2',
                width === 'lg' && 'sm:grid-cols-2 xl:grid-cols-3',
                width === 'xl' && 'sm:grid-cols-2 xl:grid-cols-4',
              )}
            >
              {children}
              {form.formState.errors.root && (
                <div className="sm:col-span-full">
                  <FormRootError form={form as unknown as UseFormReturn<T>} />
                </div>
              )}
            </div>
            <DialogFooter className="border-divider bg-surface-2/60 border-t px-6 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" aria-hidden />}
                {submitLabel ?? t('actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
