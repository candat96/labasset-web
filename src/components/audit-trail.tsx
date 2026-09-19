import { useQuery } from '@tanstack/react-query'
import { listEntityAudit } from '@/api/audit'
import { ErrorState } from '@/components/page/ErrorState'
import { Timeline } from '@/components/timeline'

export function AuditTrail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const trail = useQuery({
    queryKey: ['audit-logs', 'entity', entityType, entityId],
    queryFn: () => listEntityAudit(entityType, entityId),
    enabled: !!entityType && !!entityId,
  })
  if (trail.isPending) return <p role="status">Đang tải lịch sử…</p>
  if (trail.error) return <ErrorState error={trail.error} onRetry={() => void trail.refetch()} />
  return (
    <Timeline
      events={(trail.data?.items ?? []).map((item) => ({
        at: item.createdAt,
        title: item.action,
        summary: item.entityId,
        by: item.userId,
      }))}
    />
  )
}
