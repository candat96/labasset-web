import { api, unwrap, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { AuditListParams, AuditPage } from './types'

type ServerParams = Omit<AuditListParams, 'action' | 'q'>

function queryOf(params: ServerParams) {
  return pageQuery({
    page: params.page,
    limit: params.limit,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    from: params.from,
    to: params.to,
  })
}

export function fetchAuditPage(params: ServerParams) {
  return unwrap(api.GET('/v1/audit-logs', { params: { query: queryOf(params) } }))
}

export async function listAuditLogs(params: AuditListParams): Promise<AuditPage> {
  const { page = 1, limit = 20, ...server } = params
  return fetchAuditPage({ ...server, page, limit })
}

export async function searchAuditUsers(q: string) {
  const result = await unwrapAs<{
    items: { id: string; username: string; fullName: string }[]
  }>(api.GET('/v1/users', { params: { query: pageQuery({ q, page: 1, limit: 50 }) } }))
  return result.items.map((user) => ({
    id: user.id,
    code: user.username,
    name: user.fullName,
  }))
}

export async function listAuditUserNames() {
  const result = await unwrapAs<{
    items: { id: string; username: string; fullName: string }[]
  }>(api.GET('/v1/users', { params: { query: pageQuery({ page: 1, limit: 200 }) } }))
  return result.items
}
