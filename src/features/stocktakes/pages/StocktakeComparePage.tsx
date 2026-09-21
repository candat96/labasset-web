import { PageSkeleton } from '@/components/page/DetailSkeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionCard } from '@/components/page/SectionCard'
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
  if (compare.isPending) return <PageSkeleton label={t('comparing')} />
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
      <SectionCard title={t('compareResult', { defaultValue: 'Kết quả so sánh' })} flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t('key')}</TableHead>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('prevDiff')}</TableHead>
              <TableHead>{t('currDiff')}</TableHead>
              <TableHead>{t('repeated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.key}</TableCell>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatQty(row.prevDiff)}</TableCell>
                <TableCell>{formatQty(row.currDiff)}</TableCell>
                <TableCell>
                  {qtyNonZero(row.prevDiff) && qtyNonZero(row.currDiff) ? '✓' : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  )
}
