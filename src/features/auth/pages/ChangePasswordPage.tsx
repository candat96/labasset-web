import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { PageHeader } from '@/components/page/PageHeader'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useChangePassword } from '../hooks'
import { changeSchema, type ChangeValues } from '../schema'
import { useAuthStore } from '@/stores/auth.store'

export function Component() {
  const { t } = useTranslation('auth')
  const must = useAuthStore((s) => s.user?.mustChangePassword)
  const change = useChangePassword()
  const form = useForm<ChangeValues>({
    resolver: zodResolver(changeSchema()),
    defaultValues: { current: '', next: '', confirm: '' },
  })

  const onSubmit = (v: ChangeValues) =>
    change.mutateAsync({ current: v.current, next: v.next }).catch((e: unknown) => {
      if (!applyServerErrors(form, e))
        form.setError('root.server', { type: 'server', message: messageFor(e) })
    })

  return (
    <>
      <PageHeader title={t('change.title')} description={t('change.desc')} />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t('change.title')}</CardTitle>
          <CardDescription>{t('reset.hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {must && (
            <Alert className="mb-4">
              <ShieldAlert aria-hidden />
              <AlertDescription>{t('change.mustChange')}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              <TextField
                control={form.control}
                name="current"
                label={t('change.current')}
                type="password"
                autoComplete="current-password"
                autoFocus
              />
              <TextField
                control={form.control}
                name="next"
                label={t('change.newPassword')}
                type="password"
                autoComplete="new-password"
              />
              <TextField
                control={form.control}
                name="confirm"
                label={t('change.confirm')}
                type="password"
                autoComplete="new-password"
              />
              <FormRootError form={form} />
              <Button type="submit" disabled={change.isPending}>
                {change.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {t('change.submit')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  )
}
