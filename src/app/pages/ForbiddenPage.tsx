import { ShieldX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page/EmptyState'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={ShieldX}
      title={t('page.forbidden')}
      description={t('page.forbiddenDesc')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('actions.home')}</Link>
        </Button>
      }
    />
  )
}
