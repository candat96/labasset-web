import { useQuery } from '@tanstack/react-query'
import { listActiveUsers } from './api'

export const userKeys = { all: ['users'] as const, active: ['users', 'active'] as const }

export function useActiveUsers() {
  return useQuery({
    queryKey: userKeys.active,
    queryFn: listActiveUsers,
    staleTime: 5 * 60_000,
    select: (d) => d.items,
  })
}
