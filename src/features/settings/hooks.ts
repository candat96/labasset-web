import { useQuery } from '@tanstack/react-query'
import { getSettings } from './api'

export const settingsKeys = { all: ['settings'] as const }

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getSettings })
}
