import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useSysAuthStore } from '@/stores/sys-auth.store'
import { sysLogin } from '../api'
import { sysLoginSchema, type SysLoginValues } from '../schema'
import { safeReturnTo } from '@/lib/return-to'

export function Component() {
  const { t } = useTranslation('sys')
  const token = useSysAuthStore((s) => s.accessToken)
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = safeReturnTo(sp.get('returnTo'), '/sys/hospitals')
  const form = useForm<SysLoginValues>({
    resolver: zodResolver(sysLoginSchema),
    defaultValues: { username: '', password: '' },
  })
  if (token) return <Navigate to={returnTo} replace />
  const onSubmit = (values: SysLoginValues) =>
    sysLogin(values)
      .then((result) => {
        useSysAuthStore.getState().setSession(result)
        navigate(returnTo, { replace: true })
      })
      .catch((error: unknown) => {
        if (!applyServerErrors(form, error))
          form.setError('root.server', { type: 'server', message: messageFor(error) })
      })
  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <FlaskConical className="size-5" aria-hidden />
          </div>
          <div className="text-lg font-semibold">{t('login.brand')}</div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('login.title')}</CardTitle>
            <CardDescription>{t('login.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
                <TextField
                  control={form.control}
                  name="username"
                  label={t('login.username')}
                  autoComplete="username"
                  autoFocus
                />
                <TextField
                  control={form.control}
                  name="password"
                  label={t('login.password')}
                  type="password"
                  autoComplete="current-password"
                />
                <FormRootError form={form} />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
                  {t('login.submit')}
                </Button>
                <div className="text-center text-sm">
                  <Link to="/login" className="text-primary hover:underline">
                    {t('login.hospitalLogin')}
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
