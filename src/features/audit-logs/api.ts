import { api, unwrap, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { matchesAuditQuery } from '@/lib/audit-entity'
import type { AuditListParams, AuditLog, AuditPage } from './types'

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

export async function fetchAllAuditLogs(params: Omit<ServerParams, 'page' | 'limit'>) {
  const limit = 100
  let page = 1
  const items: AuditLog[] = []
  let total = Number.POSITIVE_INFINITY
  while (items.length < total) {
    const result = await fetchAuditPage({ ...params, page, limit })
    total = result.total
    items.push(...result.items)
    if (result.items.length === 0) break
    page += 1
  }
  return items
}

export async function listAuditLogs(params: AuditListParams): Promise<AuditPage> {
  const { action, q, page = 1, limit = 20, ...server } = params
  if (action || q) {
    const items = (await fetchAllAuditLogs(server)).filter((item) =>
      matchesAuditQuery(item, action, q),
    )
    const start = (page - 1) * limit
    return { items: items.slice(start, start + limit), total: items.length, page, limit }
  }
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
