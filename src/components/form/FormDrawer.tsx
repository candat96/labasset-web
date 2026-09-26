import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Form } from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormRootError } from './FormRootError'
import { cn } from '@/lib/utils'

/**
 * Form lớn dạng drawer trượt từ phải — dùng cho form > 8 trường (thiết bị, phiếu nhập/xuất,
 * dự trù, hợp đồng). API giống `FormDialog` để đổi chỗ dễ.
 *
 * Theo §UX quyết định 6: rộng 62% (720–1040), ≤1024 toàn màn hình; con trỏ nhảy vào trường đầu;
 * thanh nút dính đáy; `Esc`/bấm ra ngoài khi đang sửa dở thì hỏi trước khi đóng; submit lỗi thì
 * hiện tóm tắt lỗi ở đầu drawer.
 */
export function FormDrawer<T extends FieldValues, O extends FieldValues = T>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  submitting,
  submitLabel,
  secondaryAction,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: UseFormReturn<T, unknown, O>
  onSubmit: (values: O) => void | Promise<unknown>
  submitting?: boolean
  submitLabel?: string
  /** Nút phụ bên trái Huỷ — ví dụ "Lưu nháp"; tự đặt `type="button"` và `onClick` riêng. */
  secondaryAction?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const dirty = form.formState.isDirty

  // Con trỏ nhảy vào trường đầu khi mở.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      bodyRef.current
        ?.querySelector<HTMLElement>(
          'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), [data-slot=select-trigger]:not([disabled])',
        )
        ?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [open])

  const requestClose = (next: boolean) => {
    if (!next && dirty && !submitting) {
      setConfirming(true)
      return
    }
    onOpenChange(next)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent
          side="right"
          data-testid="form-drawer"
          className={cn(
            'gap-0 p-0 sm:max-w-none',
            'w-full lg:w-[62vw] lg:min-w-[720px] lg:max-w-[1040px]',
            className,
          )}
        >
          <SheetHeader className="border-divider border-b px-6 py-4">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{title}</SheetDescription>
            )}
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => void onSubmit(v))}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              <div ref={bodyRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
                <FormRootError form={form as unknown as UseFormReturn<T>} />
                {children}
              </div>
              <footer className="border-divider bg-card sticky bottom-0 flex items-center justify-end gap-2 border-t px-6 py-3">
                {secondaryAction}
                <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                  {t('actions.cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" aria-hidden />}
                  {submitLabel ?? t('actions.save')}
                </Button>
              </footer>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent data-testid="form-drawer-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('form.discardTitle', { defaultValue: 'Đóng mà không lưu?' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('form.discardBody', {
                defaultValue: 'Những thay đổi chưa lưu sẽ mất. Bạn có chắc muốn đóng?',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onOpenChange(false)
              }}
            >
              {t('form.discardConfirm', { defaultValue: 'Đóng, bỏ thay đổi' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
