import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'

export function listEntityAudit(type: string, id: string, page = 1, limit = 20) {
  return unwrap(
    api.GET('/v1/audit-logs/entity/{type}/{id}', {
      params: { path: { type, id }, query: pageQuery({ page, limit }) },
    }),
  )
}
