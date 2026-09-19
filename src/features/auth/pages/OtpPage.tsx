import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useVerifyOtp } from '../hooks'
import { otpSchema, type OtpValues } from '../schema'

export function Component() {
  const { t } = useTranslation('auth')
  const state = useLocation().state as { otpToken?: string; returnTo?: string } | null
  const verify = useVerifyOtp(state?.returnTo ?? '/')
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: '' } })

  if (!state?.otpToken) return <Navigate to="/login" replace />
  const otpToken = state.otpToken

  const onSubmit = (v: OtpValues) =>
    verify.mutateAsync({ otpToken, code: v.code }).catch((e: unknown) => {
      if (!applyServerErrors(form, e))
        form.setError('root.server', { type: 'server', message: messageFor(e) })
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('otp.title')}</CardTitle>
        <CardDescription>{t('otp.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <TextField
              control={form.control}
              name="code"
              label={t('otp.code')}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
            <FormRootError form={form} />
            <Button type="submit" className="w-full" disabled={verify.isPending}>
              {verify.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {t('otp.submit')}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">
                {t('otp.back')}
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
