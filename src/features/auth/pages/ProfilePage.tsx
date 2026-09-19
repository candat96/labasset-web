import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page/PageHeader'
import { useAuthStore } from '@/stores/auth.store'

export function Component() {
  const { t } = useTranslation('auth')
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  const rows: [string, string][] = [
    [t('profile.username'), user.username],
    [t('profile.fullName'), user.fullName],
    [t('profile.email'), user.email ?? '—'],
    [t('profile.phone'), user.phone ?? '—'],
    [t('profile.roles'), user.roles.map((r) => t(`roles.${r}`, { defaultValue: r })).join(', ')],
    [t('profile.otp'), user.otpEnabled ? t('profile.otpOn') : t('profile.otpOff')],
  ]
  return (
    <>
      <PageHeader title={t('profile.title')} />
      <Card className="max-w-lg">
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </>
  )
}
