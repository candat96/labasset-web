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
  width?: 'md' | 'lg'
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-h-[90vh] gap-0 p-0', width === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
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
                'max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-5',
                width === 'lg'
                  ? 'grid gap-x-5 gap-y-4 sm:grid-cols-2 [&>[data-slot=form-item]:has(textarea)]:sm:col-span-2'
                  : 'space-y-4',
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
