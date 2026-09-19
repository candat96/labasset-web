import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { TextField } from '@/components/form/fields'
import { FormRootError } from '@/components/form/FormRootError'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useLogin, useTenantMode } from '../hooks'
import { loginSchema, type LoginValues } from '../schema'
import { useAuthStore } from '@/stores/auth.store'

export function Component() {
  const { t } = useTranslation('auth')
  const [sp] = useSearchParams()
  const reason = sp.get('reason') ?? useAuthStore.getState().lastLogoutReason
  const mode = useTenantMode()
  const multi = mode.data !== 'single'
  const loginMut = useLogin()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(multi)),
    defaultValues: { hospitalCode: '', username: '', password: '' },
  })

  const onSubmit = (v: LoginValues) =>
    loginMut
      .mutateAsync({
        username: v.username,
        password: v.password,
        ...(multi ? { hospitalCode: v.hospitalCode?.toUpperCase() } : {}),
        deviceInfo: navigator.userAgent.slice(0, 120),
      })
      .catch((e: unknown) => {
        if (!applyServerErrors(form, e)) {
          form.setError('root.server', { type: 'server', message: messageFor(e) })
        }
      })

  const notice = reason && reason !== 'manual' ? t(`login.${reason}`, { defaultValue: '' }) : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
        <CardDescription>{t('login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {notice && (
          <Alert className="mb-4">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        {mode.isPending ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              {multi && (
                <TextField
                  control={form.control}
                  name="hospitalCode"
                  label={t('login.hospitalCode')}
                  autoComplete="organization"
                  autoFocus
                  transform={(v) => v.toUpperCase()}
                />
              )}
              <TextField
                control={form.control}
                name="username"
                label={t('login.username')}
                autoComplete="username"
                autoFocus={!multi}
              />
              <TextField
                control={form.control}
                name="password"
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
              />
              <FormRootError form={form} />
              <Button type="submit" className="w-full" disabled={loginMut.isPending}>
                {loginMut.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {t('login.submit')}
              </Button>
              <div className="text-center text-sm">
                <Link to="/forgot-password" className="text-primary hover:underline">
                  {t('login.forgot')}
                </Link>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
