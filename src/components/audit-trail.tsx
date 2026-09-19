import { useQuery } from '@tanstack/react-query'
import { listEntityAudit } from '@/api/audit'
import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { ErrorState } from '@/components/page/ErrorState'
import { Timeline } from '@/components/timeline'
import { auditActionLabel } from '@/lib/audit-actions'

export function AuditTrail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const trail = useQuery({
    queryKey: ['audit-logs', 'entity', entityType, entityId],
    queryFn: () => listEntityAudit(entityType, entityId),
    enabled: !!entityType && !!entityId,
  })
  const users = useQuery({
    queryKey: ['audit-logs', 'users'],
    queryFn: async () => {
      const result = await unwrapAs<{
        items: { id: string; username: string; fullName: string }[]
      }>(api.GET('/v1/users', { params: { query: pageQuery({ page: 1, limit: 200 }) } }))
      return result.items
    },
    staleTime: 60_000,
  })
  const names = new Map((users.data ?? []).map((user) => [user.id, user.fullName || user.username]))
  if (trail.isPending) return <p role="status">Đang tải lịch sử…</p>
  if (trail.error) return <ErrorState error={trail.error} onRetry={() => void trail.refetch()} />
  return (
    <Timeline
      events={(trail.data?.items ?? []).map((item) => ({
        at: item.createdAt,
        title: auditActionLabel(item.action),
        by: names.get(item.userId ?? '') ?? undefined,
      }))}
    />
  )
}
