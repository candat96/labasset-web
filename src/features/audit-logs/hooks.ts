import { useQuery } from '@tanstack/react-query'
import { listAuditLogs, listAuditUserNames } from './api'
import type { AuditListParams } from './types'

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: AuditListParams) => ['audit-logs', 'list', params] as const,
  users: ['audit-logs', 'users'] as const,
}

export function useAuditLogs(params: AuditListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => listAuditLogs(params),
    placeholderData: (previous) => previous,
  })
}

export function useAuditUsers() {
  return useQuery({ queryKey: auditKeys.users, queryFn: listAuditUserNames })
}
