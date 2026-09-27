import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2, PenLine, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  SIGN_SLOT_LABELS,
  getSigningProfile,
  signDocument,
  signingKeys,
  type SignSlot,
} from '../api'
import '../i18n'

export interface SignDialogProps {
  docType: string
  id: string
  slots: readonly SignSlot[]
  /** Bỏ trống để component tự giữ trạng thái mở/đóng và tự hiện nút mở. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Gọi sau khi ký thành công (để màn gọi tải lại dữ liệu). */
  onSigned?: () => void
  triggerLabel?: string
  /** Ẩn nút mở khi màn tự bố trí nút (dùng cùng `open`). */
  hideTrigger?: boolean
}

const passwordToggle = (shown: boolean): ReactNode =>
  shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />

/**
 * Hộp thoại ký số dùng lại cho mọi loại chứng từ.
 *
 * Chỉ hỏi mật khẩu/PIN khi server báo CHƯA lưu (`passwordSet` / `pinSet` === false) —
 * giá trị đã lưu không bao giờ được hiển thị lại. Trong lúc ký, nút bị khoá để không
 * gửi hai lần.
 */
export function SignDialog({
  docType,
  id,
  slots,
  open: openProp,
  onOpenChange,
  onSigned,
  triggerLabel,
  hideTrigger = false,
}: SignDialogProps) {
  const { t } = useTranslation('signing')
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const slotOptions = useMemo(
    () => (slots.length > 0 ? slots : (['handler'] as SignSlot[])),
    [slots],
  )
  const [slot, setSlot] = useState<SignSlot>(slotOptions[0] ?? 'handler')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pin, setPin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  // Khoá đồng bộ: hai cú bấm trong cùng một nhịp render vẫn chỉ gửi một lệnh ký.
  const inFlight = useRef(false)

  const profileQuery = useQuery({
    queryKey: signingKeys.profile,
    queryFn: getSigningProfile,
    enabled: open,
    staleTime: 30_000,
  })
  const profile = profileQuery.data?.profile ?? null
  const configured = profileQuery.data?.configured ?? true
  const passwordSet = profile?.passwordSet ?? false
  const pinSet = profile?.pinSet ?? false

  const reset = () => {
    setPassword('')
    setPin('')
    setShowPassword(false)
    setFormError(null)
  }

  const sign = useMutation({
    mutationFn: () =>
      signDocument(docType, id, {
        slot,
        password: password.trim() ? password : undefined,
        pin: pin.trim() ? pin : undefined,
      }),
    onSuccess: () => {
      toast.success(t('success'))
      // Làm mới danh sách bản đã ký của chứng từ.
      void queryClient.invalidateQueries({ queryKey: signingKeys.signed(docType, id) })
      reset()
      setOpen(false)
      onSigned?.()
    },
    onSettled: () => {
      inFlight.current = false
    },
  })

  const submit = () => {
    if (inFlight.current || sign.isPending) return
    if (!configured || !profile) return
    if (!passwordSet && !password.trim()) {
      setFormError(t('needPassword'))
      return
    }
    if (!pinSet && !pin.trim()) {
      setFormError(t('needPin'))
      return
    }
    setFormError(null)
    inFlight.current = true
    sign.mutate()
  }

  const errorText = sign.error ? messageFor(sign.error) : null
  const errorCode =
    sign.error && typeof sign.error === 'object' && 'code' in sign.error
      ? String((sign.error as { code?: unknown }).code)
      : null

  return (
    <>
      {!hideTrigger && openProp === undefined && (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <PenLine aria-hidden />
          {triggerLabel ?? t('signAction')}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (sign.isPending) return
          setOpen(next)
          if (!next) {
            reset()
            sign.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>{t('dialogDesc')}</DialogDescription>
          </DialogHeader>

          {profileQuery.isPending ? (
            <p className="text-muted-foreground text-sm">{t('common:page.loading')}</p>
          ) : profileQuery.isError ? (
            <Alert variant="destructive">
              <ShieldAlert aria-hidden />
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>{messageFor(profileQuery.error)}</AlertDescription>
            </Alert>
          ) : !configured ? (
            <Alert variant="warning">
              <ShieldAlert aria-hidden />
              <AlertTitle>{t('dialogTitle')}</AlertTitle>
              <AlertDescription>{t('notConfiguredDialog')}</AlertDescription>
            </Alert>
          ) : !profile ? (
            <Alert variant="warning">
              <ShieldAlert aria-hidden />
              <AlertTitle>{t('profileMissing')}</AlertTitle>
              <AlertDescription>
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  to="/settings/signing"
                >
                  {t('profileMissingAction')}
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sign-slot">{t('slotLabel')}</Label>
                <Select value={slot} onValueChange={(v) => setSlot(v as SignSlot)}>
                  <SelectTrigger id="sign-slot" className="w-full" aria-label={t('slotLabel')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {SIGN_SLOT_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!passwordSet && (
                <div className="space-y-1.5">
                  <Label htmlFor="sign-password">{t('passwordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="sign-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                      aria-label={showPassword ? t('hide') : t('show')}
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {passwordToggle(showPassword)}
                    </button>
                  </div>
                  <p className="text-muted-foreground text-xs">{t('passwordRequired')}</p>
                </div>
              )}

              {!pinSet && (
                <div className="space-y-1.5">
                  <Label htmlFor="sign-pin">{t('pinLabel')}</Label>
                  <Input
                    id="sign-pin"
                    type="password"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">{t('pinRequired')}</p>
                </div>
              )}

              {!formError && sign.error && (
                <Alert variant="destructive">
                  <ShieldAlert aria-hidden />
                  <AlertTitle>{t('errorTitle')}</AlertTitle>
                  <AlertDescription>
                    <p>{errorText}</p>
                    {errorCode === 'SIGNING_PIN_REQUIRED' && (
                      <p>
                        {t('pinHelp')} —{' '}
                        <Link
                          className="text-primary underline-offset-2 hover:underline"
                          to="/settings/signing"
                        >
                          {t('profileMissingAction')}
                        </Link>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {formError && (
                <p role="alert" className={cn('text-destructive text-sm')}>
                  {formError}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sign.isPending}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={sign.isPending || !configured || !profile}
            >
              {sign.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {sign.isPending ? t('signing') : t('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
