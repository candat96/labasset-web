import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { messageFor } from '@/api/errors'
import { EmptyState } from './EmptyState'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={AlertTriangle}
      title={t('table.error')}
      description={messageFor(error)}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        )
      }
    />
  )
}
