import type { components } from '@/api/schema'

export type AuditLog = components['schemas']['AuditViewDto']
export type AuditPage = components['schemas']['AuditPageDto']

export interface AuditListParams {
  page?: number
  limit?: number
  userId?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  // TODO(api): GET /v1/audit-logs chưa hỗ trợ action và q.
  action?: string
  q?: string
}
