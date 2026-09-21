import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { Navigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/page/ErrorState'
import { EmptyState } from '@/components/page/EmptyState'
import { isApiError } from '@/api/errors'
import { equipmentByQr } from '../api'
import { equipmentKeys } from '../hooks'

export function Component() {
  const { t } = useTranslation('equipment')
  const { token = '' } = useParams()
  const result = useQuery({
    queryKey: equipmentKeys.byQr(token),
    queryFn: () => equipmentByQr(token),
    enabled: !!token,
    retry: false,
  })
  if (result.isPending) return <DetailSkeleton label={t('byQr.loading')} />
  if (result.error) {
    const notFound =
      isApiError(result.error) &&
      (result.error.status === 404 || result.error.code === 'QR_TOKEN_NOT_FOUND')
    if (notFound) return <EmptyState title={t('byQr.notFound')} />
    return <ErrorState error={result.error} onRetry={() => void result.refetch()} />
  }
  return <Navigate to={`/equipment/${result.data.id}`} replace />
}
