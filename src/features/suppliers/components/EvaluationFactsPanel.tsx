import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarClock,
  ClipboardX,
  Info,
  PackagePlus,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { Button } from '@/components/ui/button'
import { messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'
import { getSupplierEvaluationFacts } from '../api'
import type { SupplierEvaluationFacts } from '../types'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Khối "Số liệu hệ thống" — CHỈ ĐỌC, để người chấm có căn cứ. */
export function EvaluationFactsPanel({
  supplierId,
  from,
  to,
  className,
}: {
  supplierId: string
  from?: string
  to?: string
  className?: string
}) {
  const { t } = useTranslation('suppliers')
  const ready = DATE_ONLY.test(from ?? '') && DATE_ONLY.test(to ?? '')
  const facts = useQuery({
    queryKey: ['supplier-evaluation-facts', supplierId, from, to],
    queryFn: () => getSupplierEvaluationFacts(supplierId, from, to),
    enabled: ready,
  })
  return (
    <SectionCard
      title={t('facts.title')}
      description={t('facts.periodHint')}
      className={cn('h-full', className)}
    >
      {!ready ? (
        <p className="text-muted-foreground text-sm">{t('facts.needPeriod')}</p>
      ) : facts.isPending ? (
        <div className="bg-muted/60 h-24 animate-pulse rounded-md" />
      ) : facts.error ? (
        <div className="space-y-2">
          <p className="text-destructive text-sm">{messageFor(facts.error)}</p>
          <Button variant="outline" size="sm" onClick={() => void facts.refetch()}>
            <RefreshCw />
            {t('common:actions.retry')}
          </Button>
        </div>
      ) : facts.data ? (
        <FactsBody facts={facts.data} />
      ) : null}
      <p className="text-muted-foreground mt-4 flex gap-1.5 text-[12.5px] leading-4">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{t('facts.disclaimer')}</span>
      </p>
    </SectionCard>
  )
}

function FactsBody({ facts }: { facts: SupplierEvaluationFacts }) {
  const { t } = useTranslation('suppliers')
  const rows: { key: string; icon: LucideIcon; label: string; value: number }[] = [
    {
      key: 'receipt',
      icon: PackagePlus,
      label: t('facts.receiptCount'),
      value: facts.receiptCount,
    },
    { key: 'qc', icon: ClipboardX, label: t('facts.qcFailedCount'), value: facts.qcFailedCount },
    {
      key: 'quarantine',
      icon: Ban,
      label: t('facts.quarantineLotCount'),
      value: facts.quarantineLotCount,
    },
    {
      key: 'return',
      icon: Undo2,
      label: t('facts.returnToSupplierCount'),
      value: facts.returnToSupplierCount,
    },
    {
      key: 'shelf',
      icon: CalendarClock,
      label: t('facts.shortShelfLifeLotCount'),
      value: facts.shortShelfLifeLotCount,
    },
  ]
  return (
    <dl className="divide-divider divide-y">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
          <dt className="text-muted-foreground flex items-center gap-2 text-[13px]">
            <row.icon className="size-4 shrink-0" aria-hidden />
            {row.label}
          </dt>
          <dd className="text-[15px] font-semibold tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
