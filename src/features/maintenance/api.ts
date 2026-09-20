import { api, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'
import type { TaskListParams } from './types'

export function listTemplates() {
  return unwrap(api.GET('/v1/maintenance/templates'))
}
export function getTemplate(id: string) {
  return unwrap(api.GET('/v1/maintenance/templates/{id}', { params: { path: { id } } }))
}
export function createTemplate(body: components['schemas']['TemplateDto']) {
  return unwrap(api.POST('/v1/maintenance/templates', { body }))
}
export function updateTemplate(id: string, body: components['schemas']['UpdateTemplateDto']) {
  return unwrap(api.PATCH('/v1/maintenance/templates/{id}', { params: { path: { id } }, body }))
}
export function deleteTemplate(id: string) {
  return unwrap(api.DELETE('/v1/maintenance/templates/{id}', { params: { path: { id } } }))
}
export function cloneTemplate(id: string) {
  return unwrap(api.POST('/v1/maintenance/templates/{id}/clone', { params: { path: { id } } }))
}

export function listPlans() {
  return unwrap(api.GET('/v1/maintenance/plans'))
}
export function getPlan(id: string) {
  return unwrap(api.GET('/v1/maintenance/plans/{id}', { params: { path: { id } } }))
}
export function createPlan(body: components['schemas']['PlanDto']) {
  return unwrap(api.POST('/v1/maintenance/plans', { body }))
}
export function updatePlan(id: string, body: components['schemas']['UpdatePlanDto']) {
  return unwrap(api.PATCH('/v1/maintenance/plans/{id}', { params: { path: { id } }, body }))
}
export function previewPlan(id: string, year: number) {
  return unwrap(
    api.GET('/v1/maintenance/plans/{id}/preview', { params: { path: { id }, query: { year } } }),
  )
}
export function generatePlan(id: string, year: number) {
  return unwrapAs<{ created?: number; skipped?: number }>(
    api.POST('/v1/maintenance/plans/{id}/generate', { params: { path: { id }, query: { year } } }),
  )
}

export function listTasks(params: TaskListParams) {
  return unwrap(api.GET('/v1/maintenance/tasks', { params: { query: pageQuery(params) } }))
}
export function getTask(id: string) {
  return unwrap(api.GET('/v1/maintenance/tasks/{id}', { params: { path: { id } } }))
}
export function createTask(body: components['schemas']['CreateTaskDto']) {
  return unwrap(api.POST('/v1/maintenance/tasks', { body }))
}
export function startTask(id: string) {
  return unwrap(
    api.POST('/v1/maintenance/tasks/{id}/start', { params: { path: { id } }, body: {} }),
  )
}
export function saveResults(id: string, body: components['schemas']['SaveResultsDto']) {
  return unwrap(api.PUT('/v1/maintenance/tasks/{id}/results', { params: { path: { id } }, body }))
}
export function finishTask(id: string, body: components['schemas']['FinishTaskDto']) {
  return unwrap(api.POST('/v1/maintenance/tasks/{id}/finish', { params: { path: { id } }, body }))
}
export function skipTask(id: string, reason: string) {
  return unwrap(
    api.POST('/v1/maintenance/tasks/{id}/skip', { params: { path: { id } }, body: { reason } }),
  )
}
export function reassignTask(id: string, assigneeId: string) {
  return unwrap(
    api.POST('/v1/maintenance/tasks/{id}/reassign', {
      params: { path: { id } },
      body: { assigneeId },
    }),
  )
}
export function signTask(
  id: string,
  body: { role: 'technician' | 'department'; fileId: string; signerName: string },
) {
  return unwrap(
    api.POST('/v1/maintenance/tasks/{id}/signatures', { params: { path: { id } }, body }),
  )
}
export function downloadTaskReport(id: string, code: string) {
  return downloadFile(`/v1/maintenance/tasks/${id}/report.pdf`, {}, `bien-ban-bd-${code}.pdf`)
}

export function listCalendar(query: {
  from: string
  to: string
  types?: string
  assigneeId?: string
  departmentId?: string
}) {
  return unwrap(api.GET('/v1/calendar', { params: { query } }))
}
export function moveCalendar(type: string, id: string, scheduledAt: string) {
  return unwrap(
    api.PATCH('/v1/calendar/{type}/{id}/move', {
      params: { path: { type, id } },
      body: { scheduledAt },
    }),
  )
}
