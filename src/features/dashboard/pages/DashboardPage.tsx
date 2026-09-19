import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  Microscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/page/PageHeader'
import type { StatusTone } from '@/components/page/StatusBadge'
import { formatNumber } from '@/lib/format/number'
import { cn } from '@/lib/utils'
import { useDashboard } from '../hooks'

const ICONS: Record<string, LucideIcon> = {
  equipmentActive: Microscope,
  equipmentBroken: Wrench,
  maintenanceDue: ClipboardList,
  calibrationDue: Gauge,
  suppliesLow: Boxes,
  requestsPending: FileText,
  repairsOpen: Wrench,
}

const TONE: Record<StatusTone, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-sky-600 dark:text-sky-400',
  muted: 'text-muted-foreground',
}

export function Component() {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation()
  const q = useDashboard()

  return (
    <>
      <PageHeader
        title={t('title')}
        description={q.data?.isMock ? t('mockNote') : t('desc')}
        badge={q.data?.isMock && <Badge variant="outline">{tc('mock')}</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {q.isPending
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : q.data?.kpis.map((k) => {
              const Icon = ICONS[k.key] ?? Microscope
              return (
                <Card key={k.key} className="py-0" data-testid="kpi-card">
                  <CardContent className="p-0">
                    <Link
                      to={k.to}
                      className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-lg p-4 outline-none focus-visible:ring-2"
                    >
                      <div
                        className={cn(
                          'bg-muted flex size-10 shrink-0 items-center justify-center rounded-md',
                          TONE[k.tone],
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground truncate text-xs">
                          {t(`kpi.${k.key}`)}
                        </div>
                        <div className="text-2xl font-semibold tabular-nums">
                          {formatNumber(k.value)}
                        </div>
                      </div>
                      <ArrowRight className="text-muted-foreground size-4" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </>
  )
}
