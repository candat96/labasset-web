import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { TaskListParams } from './types'

export const maintKeys = {
  all: ['maintenance'] as const,
  templates: () => ['maintenance', 'templates'] as const,
  template: (id: string) => ['maintenance', 'templates', id] as const,
  plans: () => ['maintenance', 'plans'] as const,
  plan: (id: string) => ['maintenance', 'plans', id] as const,
  tasks: (p: TaskListParams) => ['maintenance', 'tasks', p] as const,
  task: (id: string) => ['maintenance', 'tasks', id] as const,
}

export function useTemplates() {
  return useQuery({ queryKey: maintKeys.templates(), queryFn: api.listTemplates })
}
export function useTemplate(id: string) {
  return useQuery({
    queryKey: maintKeys.template(id),
    queryFn: () => api.getTemplate(id),
    enabled: !!id,
  })
}
export function usePlans() {
  return useQuery({ queryKey: maintKeys.plans(), queryFn: api.listPlans })
}
export function usePlan(id: string) {
  return useQuery({
    queryKey: maintKeys.plan(id),
    queryFn: () => api.getPlan(id),
    enabled: !!id,
  })
}
export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: maintKeys.tasks(params),
    queryFn: () => api.listTasks(params),
    placeholderData: (p) => p,
  })
}
export function useTask(id: string) {
  return useQuery({
    queryKey: maintKeys.task(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
  })
}
export function useInvalidateTemplates() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['maintenance', 'templates'] })
}
export function useInvalidatePlans() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['maintenance', 'plans'] })
}
export function useInvalidateTasks() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['maintenance', 'tasks'] })
    void qc.invalidateQueries({ queryKey: ['dashboard', 'maint'] })
    void qc.invalidateQueries({ queryKey: ['calendar'] })
  }
}
