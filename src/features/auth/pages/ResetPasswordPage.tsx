import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useResetPassword } from '../hooks'
import { resetSchema, type ResetValues } from '../schema'

export function Component() {
  const { t } = useTranslation('auth')
  const token = useSearchParams()[0].get('token')
  const reset = useResetPassword()
  const [done, setDone] = useState(false)
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema()),
    defaultValues: { next: '', confirm: '' },
  })

  const onSubmit = (v: ResetValues) =>
    reset
      .mutateAsync({ token: token ?? '', next: v.next })
      .then(() => setDone(true))
      .catch((e: unknown) => {
        if (!applyServerErrors(form, e))
          form.setError('root.server', { type: 'server', message: messageFor(e) })
      })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reset.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!token ? (
          <Alert variant="destructive">
            <AlertDescription>{t('reset.invalidLink')}</AlertDescription>
          </Alert>
        ) : done ? (
          <Alert>
            <AlertDescription>{t('reset.success')}</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              <TextField
                control={form.control}
                name="next"
                label={t('reset.newPassword')}
                type="password"
                autoComplete="new-password"
                description={t('reset.hint')}
                autoFocus
              />
              <TextField
                control={form.control}
                name="confirm"
                label={t('reset.confirm')}
                type="password"
                autoComplete="new-password"
              />
              <FormRootError form={form} />
              <Button type="submit" className="w-full" disabled={reset.isPending}>
                {reset.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {t('reset.submit')}
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
