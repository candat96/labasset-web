import { useQuery } from '@tanstack/react-query'
import type { StatusTone } from '@/components/page/StatusBadge'

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

// TODO(api): thay bằng GET /v1/dashboard khi backend có (xem README "API còn thiếu").
const MOCK: DashboardData = {
  isMock: true,
  kpis: [
    { key: 'equipmentActive', value: 42, tone: 'success', to: '/equipment' },
    { key: 'equipmentBroken', value: 3, tone: 'danger', to: '/equipment' },
    { key: 'maintenanceDue', value: 5, tone: 'warning', to: '/maintenance/tasks' },
    { key: 'calibrationDue', value: 2, tone: 'warning', to: '/calibrations' },
    { key: 'suppliesLow', value: 7, tone: 'warning', to: '/stock/alerts' },
    { key: 'requestsPending', value: 4, tone: 'info', to: '/requests' },
    { key: 'repairsOpen', value: 6, tone: 'info', to: '/repairs' },
  ],
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: async () => MOCK })
}
