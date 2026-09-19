import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
interface ConfirmOptions {
  title: string
  description?: string
  requireReason?: boolean
  destructive?: boolean
  confirmLabel?: string
}
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [reason, setReason] = useState('')
  const resolver = useRef<((result: string | false) => void) | null>(null)
  const finish = useCallback((result: string | false) => {
    resolver.current?.(result)
    resolver.current = null
    setOptions(null)
    setReason('')
  }, [])
  useEffect(
    () => () => {
      resolver.current?.(false)
    },
    [],
  )
  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false)
    setReason('')
    setOptions(next)
    return new Promise<string | false>((resolve) => {
      resolver.current = resolve
    })
  }, [])
  const dialog = (
    <AlertDialog
      open={!!options}
      onOpenChange={(open) => {
        if (!open) finish(false)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {options?.description ?? 'Vui lòng xác nhận thao tác.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {options?.requireReason && (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">Lý do (bắt buộc)</Label>
            <Input id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            className={
              options?.destructive ? 'bg-destructive text-white hover:bg-destructive/90' : ''
            }
            disabled={options?.requireReason && !reason.trim()}
            onClick={() => finish(reason.trim())}
          >
            {options?.confirmLabel ?? 'Xác nhận'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return { confirm, dialog }
}
