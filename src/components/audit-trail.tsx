import { useQuery } from '@tanstack/react-query'
import { listEntityAudit } from '@/api/audit'
import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { ErrorState } from '@/components/page/ErrorState'
import { Timeline } from '@/components/timeline'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { auditActionLabel } from '@/lib/audit-actions'
import { shortId } from '@/lib/format/id'
import { fieldChanges } from '@/lib/audit-fields'

export function AuditTrail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const canListUsers = useCan(ADM)
  const trail = useQuery({
    queryKey: ['audit-logs', 'entity', entityType, entityId],
    queryFn: () => listEntityAudit(entityType, entityId),
    enabled: !!entityType && !!entityId,
  })
  // `GET /v1/users` chỉ HOSPITAL_ADMIN đọc được (handoff/06 B6) → role khác không gọi.
  const users = useQuery({
    queryKey: ['audit-logs', 'users'],
    queryFn: async () => {
      const result = await unwrapAs<{
        items: { id: string; username: string; fullName: string }[]
      }>(api.GET('/v1/users', { params: { query: pageQuery({ page: 1, limit: 200 }) } }))
      return result.items
    },
    staleTime: 60_000,
    enabled: canListUsers,
  })
  const names = new Map((users.data ?? []).map((user) => [user.id, user.fullName || user.username]))
  if (trail.isPending) return <p role="status">Đang tải lịch sử…</p>
  if (trail.error) return <ErrorState error={trail.error} onRetry={() => void trail.refetch()} />
  return (
    <Timeline
      events={(trail.data?.items ?? []).map((item) => {
        const changes = item.action === 'update' ? fieldChanges(item.before, item.after) : []
        const shown = changes.slice(0, 6)
        const title =
          changes.length > 0
            ? `${auditActionLabel(item.action)}: ${shown.map((c) => c.label).join(', ')}${changes.length > shown.length ? ` +${changes.length - shown.length}` : ''}`
            : auditActionLabel(item.action)
        const summary =
          shown.length > 0
            ? shown.map((c) => `${c.label}: ${c.from} → ${c.to}`).join('\n')
            : undefined
        return {
          at: item.createdAt,
          title,
          summary,
          by: names.get(item.userId ?? '') ?? shortId(item.userId),
          tone:
            item.action === 'create'
              ? ('success' as const)
              : item.action === 'delete'
                ? ('danger' as const)
                : undefined,
        }
      })}
    />
  )
}
