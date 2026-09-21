import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Markdown } from '../components/MessageBubble'
import { PageHeader } from '@/components/page/PageHeader'
import { DatePicker } from '@/components/date-picker'
import { Label } from '@/components/ui/label'
import { getWeeklyDigest } from '../api'
import { isApiError, messageFor } from '@/api/errors'

function startOfIsoWeek(date = new Date()) {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  return copy.toISOString().slice(0, 10)
}

export function Component() {
  const { t } = useTranslation('assistant')
  const [weekStart, setWeekStart] = useState(startOfIsoWeek())
  const digest = useQuery({
    queryKey: ['ai-digest', weekStart],
    queryFn: () => getWeeklyDigest(weekStart),
  })
  const stats = useMemo(() => digest.data?.stats ?? {}, [digest.data])
  return (
    <>
      <PageHeader title={t('digest')} />
      <div className="mb-4 max-w-xs space-y-1">
        <Label htmlFor="week-start">{t('weekStart')}</Label>
        <DatePicker
          ariaLabel={t('weekStart')}
          value={weekStart}
          onChange={(value) => value && setWeekStart(value)}
        />
      </div>
      {digest.isPending && <p role="status">{t('digestLoading')}</p>}
      {digest.error && (
        <p role="alert">
          {isApiError(digest.error) && digest.error.code === 'AI_DIGEST_NOT_FOUND'
            ? t('digestEmpty')
            : messageFor(digest.error)}
        </p>
      )}
      {digest.data && (
        <>
          <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            {Object.entries(stats).map(([key, value]) => (
              <li key={key} className="rounded border p-3">
                <div className="text-muted-foreground">{key}</div>
                <div className="font-medium">{String(value)}</div>
              </li>
            ))}
          </ul>
          {digest.data.content ? (
            <Markdown content={digest.data.content} className="bg-surface-2 rounded-xl p-4" />
          ) : (
            <p className="text-muted-foreground text-sm">{t('notConfigured')}</p>
          )}
        </>
      )}
    </>
  )
}
