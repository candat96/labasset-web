import { useQueries } from '@tanstack/react-query'
import type { StatusTone } from '@/components/page/StatusBadge'
import { api, untypedApi, unwrapAs } from '@/api/client'
import { apiQuery, pageQuery } from '@/api/paths'
import type { paths } from '@/api/schema'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'

type EquipmentQuery = NonNullable<paths['/v1/equipment']['get']['parameters']['query']>

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

function totalOf(data: unknown) {
  return typeof data === 'object' && data !== null && 'total' in data
    ? Number((data as { total?: number }).total ?? 0)
    : 0
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
              params: { query: apiQuery<EquipmentQuery>({ status: 'active', page: 1, limit: 1 }) },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'eq-broken'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: { query: apiQuery<EquipmentQuery>({ status: 'broken', page: 1, limit: 1 }) },
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
              params: {
                query: pageQuery({
                  status: 'scheduled',
                  to: plus30.toISOString(),
                  page: 1,
                  limit: 1,
                }),
              },
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
                query: pageQuery({ pendingFor: 'me' as const, page: 1, limit: 1 }),
              },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'alerts'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/stock/alerts', {
              params: { query: pageQuery({ resolved: false, page: 1, limit: 1 }) },
            }),
          ),
        enabled: isStaff,
      },
      {
        queryKey: ['dashboard', 'eq-awaiting-parts'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: {
                query: apiQuery<EquipmentQuery>({ status: 'awaiting_parts', page: 1, limit: 1 }),
              },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'repairs-overdue'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/repairs', {
              params: { query: pageQuery({ overdue: true, page: 1, limit: 1 }) },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'maint-overdue'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/maintenance/tasks', {
              params: { query: pageQuery({ status: 'overdue', page: 1, limit: 1 }) },
            }),
          ),
      },
      {
        queryKey: ['dashboard', 'cal-overdue'],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/equipment', {
              params: { query: pageQuery({ calibrationOverdue: true, page: 1, limit: 1 }) },
            }),
          ),
      },
      ...(['low_stock', 'expiring', 'expired'] as const).map((type) => ({
        queryKey: ['dashboard', 'alert', type],
        queryFn: () =>
          unwrapAs<{ total: number }>(
            api.GET('/v1/stock/alerts', {
              params: { query: pageQuery({ resolved: false, type, page: 1, limit: 1 }) },
            }),
          ),
        enabled: isStaff,
      })),
      {
        queryKey: ['dashboard', 'stock-value'],
        queryFn: () =>
          unwrapAs<{ value?: string; totalValue?: string }>(untypedApi.GET('/v1/stock/value')),
        enabled: isStaff,
      },
      {
        queryKey: ['dashboard', 'repair-cost-month'],
        queryFn: () =>
          unwrapAs<{ totalCost?: string }>(
            api.GET('/v1/repairs/stats', {
              params: { query: { from: fromMonth.toISOString(), to: new Date().toISOString() } },
            }),
          ),
        enabled: isStaff,
      },
    ],
  })
  const [
    active,
    broken,
    repairs,
    maint,
    cal,
    req,
    alerts,
    awaitingParts,
    repairsOverdue,
    maintOverdue,
    calOverdue,
    lowStock,
    expiring,
    expired,
    stockValue,
    repairCost,
  ] = queries
  const pending = queries.some((q) => q.isPending)
  const kpis: DashboardKpi[] = [
    {
      key: 'equipmentActive',
      value: totalOf(active?.data),
      tone: 'success',
      to: '/equipment?status=active',
    },
    {
      key: 'equipmentBroken',
      value: totalOf(broken?.data),
      tone: 'danger',
      to: '/equipment?status=broken',
    },
    {
      key: 'equipmentAwaitingParts',
      value: totalOf(awaitingParts?.data),
      tone: 'warning',
      to: '/equipment?status=awaiting_parts',
    },
    { key: 'repairsOpen', value: totalOf(repairs?.data), tone: 'info', to: '/repairs' },
    {
      key: 'repairsOverdue',
      value: totalOf(repairsOverdue?.data),
      tone: 'danger',
      to: '/repairs?overdue=true',
    },
    {
      key: 'maintenanceDue',
      value: totalOf(maint?.data),
      tone: 'warning',
      to: '/maintenance/tasks',
    },
    {
      key: 'maintenanceOverdue',
      value: totalOf(maintOverdue?.data),
      tone: 'danger',
      to: '/maintenance/tasks?status=overdue',
    },
    { key: 'calibrationDue', value: totalOf(cal?.data), tone: 'warning', to: '/calibrations' },
    {
      key: 'calibrationOverdue',
      value: totalOf(calOverdue?.data),
      tone: 'danger',
      to: '/calibrations?overdue=true',
    },
    {
      key: 'requestsPending',
      value: totalOf(req?.data),
      tone: 'info',
      to: '/requests?pendingFor=me',
    },
  ]
  if (isStaff)
    kpis.push(
      {
        key: 'suppliesLow',
        value: totalOf(lowStock?.data) || totalOf(alerts?.data),
        tone: 'warning',
        to: '/stock/alerts?type=low_stock',
      },
      {
        key: 'suppliesExpiring',
        value: totalOf(expiring?.data),
        tone: 'warning',
        to: '/stock/alerts?type=expiring',
      },
      {
        key: 'suppliesExpired',
        value: totalOf(expired?.data),
        tone: 'danger',
        to: '/stock/alerts?type=expired',
      },
      {
        key: 'stockValue',
        value: Number(
          (stockValue?.data as { value?: string; totalValue?: string } | undefined)?.value ??
            (stockValue?.data as { totalValue?: string } | undefined)?.totalValue ??
            0,
        ),
        tone: 'info',
        to: '/stock/balances',
      },
      {
        key: 'repairCostMonth',
        value: Number((repairCost?.data as { totalCost?: string } | undefined)?.totalCost ?? 0),
        tone: 'info',
        to: '/repairs/stats',
      },
    )
  return {
    isPending: pending,
    data: { isMock: false, kpis } satisfies DashboardData,
  }
}
