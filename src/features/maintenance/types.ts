import type { components } from '@/api/schema'

export type Template = components['schemas']['TemplateResponseDto']
export type Plan = components['schemas']['PlanResponseDto']
export type Task = components['schemas']['TaskResponseDto']
export type TaskDetail = components['schemas']['TaskDetailDto']
export type CalendarItem = components['schemas']['CalendarItemDto']
export type ChecklistItem = components['schemas']['ChecklistItemDto']
export type ResultRow = components['schemas']['ResultDto']

export interface TaskListParams {
  page?: number
  limit?: number
  q?: string
  status?: string
  type?: Task['type']
  assigneeId?: string
  equipmentId?: string
  departmentId?: string
  from?: string
  to?: string
  planId?: string
}
