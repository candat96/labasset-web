import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { formatQty } from '@/lib/format/number'
import { isApiError, messageFor } from '@/api/errors'
import { compareStocktakes } from '../api'
import { useTranslation } from 'react-i18next'

function qtyNonZero(value: string | null | undefined) {
  if (value == null || value === '') return false
  return !/^-?0+(?:\.0+)?$/.test(value)
}

export function Component() {
  const { t } = useTranslation('stocktakes')

  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const withSessionId = params.get('withSessionId') ?? ''
  const compare = useQuery({
    queryKey: ['stocktakes', id, 'compare', withSessionId],
    queryFn: () => compareStocktakes(id, withSessionId),
    enabled: !!id && !!withSessionId,
  })
  useEffect(() => {
    if (!compare.error) return
    if (isApiError(compare.error) && compare.error.code === 'STOCKTAKE_SCOPE_MISMATCH') {
      toast.error(messageFor(compare.error))
    }
  }, [compare.error])
  if (!withSessionId) {
    return (
      <>
        <PageHeader title={t('compareTitle')} />
        <p className="text-muted-foreground text-sm">{t('missingSession')}</p>
      </>
    )
  }
  if (compare.isPending) return <p role="status">{t('comparing')}</p>
  if (compare.error)
    return <ErrorState error={compare.error} onRetry={() => void compare.refetch()} />
  const data = compare.data
  if (!data) return <p role="status">{t('comparing')}</p>
  const summary = data.summary
  return (
    <>
      <PageHeader title={t('compareTitle')} />
      <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t('prevDiff')}</dt>
          <dd>{summary.prevDiffCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('currDiff')}</dt>
          <dd>{summary.currDiffCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('repeated')}</dt>
          <dd>{summary.repeated}</dd>
        </div>
      </dl>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('key')}</th>
            <th>{t('code')}</th>
            <th>{t('name')}</th>
            <th>{t('prevDiff')}</th>
            <th>{t('currDiff')}</th>
            <th>{t('repeated')}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row) => (
            <tr key={row.key} className="border-t">
              <td>{row.key}</td>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{formatQty(row.prevDiff)}</td>
              <td>{formatQty(row.currDiff)}</td>
              <td>{qtyNonZero(row.prevDiff) && qtyNonZero(row.currDiff) ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
