import { useQueries } from '@tanstack/react-query'
import type { StatusTone } from '@/components/page/StatusBadge'
import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'

export interface DashboardKpi {
  key: string
  value: number
  tone: StatusTone
  to: string
}
export interface DashboardData {
  isMock: boolean
  kpis: DashboardKpi[]
}

function totalOf(data: { total?: number } | undefined) {
  return data?.total ?? 0
}

export function useDashboard() {
  const isStaff = useCan(STAFF)
  const plus30 = new Date()
  plus30.setUTCDate(plus30.getUTCDate() + 30)
  const fromMonth = new Date()
  fromMonth.setUTCDate(1)
  const queries = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'eq-active'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: { query: pageQuery({ status: 'active', page: 1, limit: 1 }) as never },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'eq-broken'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: { query: pageQuery({ status: 'broken', page: 1, limit: 1 }) as never },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'repairs-open'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/repairs', {
              params: {
                query: pageQuery({
                  status: 'new,accepted,in_progress,awaiting_parts,awaiting_vendor',
                  page: 1,
                  limit: 1,
                }),
              },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'maint'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/maintenance/tasks', {
              params: { query: pageQuery({ status: 'scheduled', page: 1, limit: 1 }) },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'cal'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: {
                query: pageQuery({ calibrationDueBefore: plus30.toISOString(), page: 1, limit: 1 }),
              },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'req'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/requests', {
              params: {
                query: pageQuery({ pendingFor: 'me' as const, page: 1, limit: 1 }) as never,
              },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'alerts'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/stock/alerts', {
              params: { query: pageQuery({ resolved: false, page: 1, limit: 1 }) as never },
            }),
          ),
        enabled: isStaff,
      },
    ],
  })
  const [active, broken, repairs, maint, cal, req, alerts] = queries
  const pending = queries.some((q) => q.isPending)
  const kpis: DashboardKpi[] = [
    {
      key: 'equipmentActive',
      value: totalOf(active.data),
      tone: 'success',
      to: '/equipment?status=active',
    },
    {
      key: 'equipmentBroken',
      value: totalOf(broken.data),
      tone: 'danger',
      to: '/equipment?status=broken',
    },
    { key: 'repairsOpen', value: totalOf(repairs.data), tone: 'info', to: '/repairs' },
    {
      key: 'maintenanceDue',
      value: totalOf(maint.data),
      tone: 'warning',
      to: '/maintenance/tasks',
    },
    { key: 'calibrationDue', value: totalOf(cal.data), tone: 'warning', to: '/calibrations' },
    {
      key: 'requestsPending',
      value: totalOf(req.data),
      tone: 'info',
      to: '/requests?pendingFor=me',
    },
  ]
  if (isStaff)
    kpis.push({
      key: 'suppliesLow',
      value: totalOf(alerts.data),
      tone: 'warning',
      to: '/stock/alerts',
    })
  return {
    isPending: pending,
    data: { isMock: false, kpis } satisfies DashboardData,
  }
}
