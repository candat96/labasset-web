import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page/EmptyState'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={SearchX}
      title={t('page.notFound')}
      description={t('page.notFoundDesc')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('actions.home')}</Link>
        </Button>
      }
    />
  )
}
