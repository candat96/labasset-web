import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import type { StatusTone } from '@/components/page/StatusBadge'

type DashboardResponse = components['schemas']['DashboardResponseDto']

export interface DashboardKpi {
  key: string
  title: string
  value: string | number
  unit?: string
  trend?: number
  tone: StatusTone
  to: string
}

const toneFor = (key: string): StatusTone => {
  if (/broken|overdue|expired/i.test(key)) return 'danger'
  if (/due|lowStock|expiring/i.test(key)) return 'warning'
  if (/active/i.test(key)) return 'success'
  return 'info'
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const data = (await unwrap(api.GET('/v1/dashboard'))) as DashboardResponse
      return {
        generatedAt: data.generatedAt,
        kpis: data.cards.map((card) => ({
          key: card.key,
          title: card.title,
          value: card.value as unknown as string | number,
          unit: card.unit,
          trend: card.trend,
          tone: toneFor(card.key),
          to: card.link,
        })),
      }
    },
  })
}
