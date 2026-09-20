import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getStatus } from '../api'

// TODO(api): D2 AI chưa có trong OpenAPI. UI theo hợp đồng handoff/05-D2-ai-assistant.md.

export function Component() {
  const { t } = useTranslation('assistant')
  const status = useQuery({ queryKey: ['ai-status'], queryFn: getStatus })
  const [params] = useSearchParams()
  const [draft, setDraft] = useState('')
  const enabled = status.data?.enabled === true
  if (status.isPending) return <p role="status">{t('checking')}</p>
  if (!enabled) {
    return (
      <>
        <PageHeader title={t('title')} />
        <p role="status">{t('disabled')}</p>
      </>
    )
  }
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button asChild variant="outline">
            <Link to="/assistant/digest">{t('digest')}</Link>
          </Button>
        }
      />
      <p className="text-muted-foreground mb-2 text-sm">
        {params.get('equipmentId')
          ? t('equipmentContext', { id: params.get('equipmentId') })
          : t('selectContext')}
      </p>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside>
          <Button>{t('new')}</Button>
        </aside>
        <section>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t('question')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) event.preventDefault()
            }}
          />
          <Button className="mt-2">{t('send')}</Button>
        </section>
      </div>
    </>
  )
}
