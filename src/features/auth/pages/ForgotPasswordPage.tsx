import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useForgotPassword, useTenantMode } from '../hooks'
import { forgotSchema, type ForgotValues } from '../schema'

export function Component() {
  const { t } = useTranslation('auth')
  const mode = useTenantMode()
  const multi = mode.data !== 'single'
  const forgot = useForgotPassword()
  const [sent, setSent] = useState(false)
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema(multi)),
    defaultValues: { hospitalCode: '', username: '' },
  })

  const onSubmit = (v: ForgotValues) =>
    forgot
      .mutateAsync({
        username: v.username,
        ...(multi ? { hospitalCode: v.hospitalCode?.toUpperCase() } : {}),
      })
      .then(() => setSent(true))
      .catch((e: unknown) => {
        if (!applyServerErrors(form, e))
          form.setError('root.server', { type: 'server', message: messageFor(e) })
      })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('forgot.title')}</CardTitle>
        <CardDescription>{t('forgot.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <Alert>
            <AlertDescription>{t('forgot.sent')}</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              {multi && (
                <TextField
                  control={form.control}
                  name="hospitalCode"
                  label={t('login.hospitalCode')}
                  transform={(v) => v.toUpperCase()}
                  autoFocus
                />
              )}
              <TextField
                control={form.control}
                name="username"
                label={t('login.username')}
                autoComplete="username"
              />
              <FormRootError form={form} />
              <Button
                type="submit"
                className="w-full"
                disabled={forgot.isPending || mode.isPending}
              >
                {forgot.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {t('forgot.submit')}
              </Button>
            </form>
          </Form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            {t('forgot.back')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
