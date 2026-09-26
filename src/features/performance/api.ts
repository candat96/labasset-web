import { api, unwrap } from '@/api/client'
import { downloadFile } from '@/api/download'
import { printFile } from '@/api/print'
import type { components } from '@/api/schema'

export type KpiPeriodType = 'week' | 'month' | 'quarter' | 'year'
export type KpiBoard = components['schemas']['KpiBoardResponseDto']
export type KpiStaffRow = components['schemas']['KpiStaffRowDto']
export type KpiAreaScore = components['schemas']['KpiAreaScoreDto']
export type KpiPeriodItem = components['schemas']['KpiPeriodItemDto']
export type KpiPeriods = components['schemas']['KpiPeriodsResponseDto']
export type KpiUser = components['schemas']['KpiUserResponseDto']
export type KpiPerson = components['schemas']['KpiPersonResponseDto']
export type KpiDepartmentRow = components['schemas']['KpiDepartmentRowDto']
export type KpiDepartments = components['schemas']['KpiDepartmentsResponseDto']
export type KpiWeights = components['schemas']['KpiWeightsDto']

export interface BoardParams {
  type: KpiPeriodType
  start?: string
  departmentId?: string
}

export function getBoard(params: BoardParams) {
  return unwrap(
    api.GET('/v1/performance', {
      params: {
        query: { type: params.type, start: params.start, departmentId: params.departmentId },
      },
    }),
  )
}

export function getPeriods(type: KpiPeriodType) {
  return unwrap(api.GET('/v1/performance/periods', { params: { query: { type } } }))
}

export function getDepartments(params: Omit<BoardParams, 'departmentId'>) {
  return unwrap(
    api.GET('/v1/performance/departments', {
      params: { query: { type: params.type, start: params.start } },
    }),
  )
}

export function getMe(params: { type: KpiPeriodType; start?: string }) {
  return unwrap(
    api.GET('/v1/performance/me', {
      params: { query: { type: params.type, start: params.start } },
    }),
  )
}

export function getUser(
  id: string,
  params: { type: KpiPeriodType; start?: string; page?: number; limit?: number },
) {
  return unwrap(
    api.GET('/v1/performance/users/{id}', {
      params: {
        path: { id },
        query: {
          type: params.type,
          start: params.start,
          page: params.page,
          limit: params.limit,
        },
      },
    }),
  )
}

export function lockPeriod(type: KpiPeriodType, start: string, note?: string) {
  return unwrap(
    api.POST('/v1/performance/periods/{type}/{start}/lock', {
      params: { path: { type, start } },
      body: note ? { note } : {},
    }),
  )
}

export function unlockPeriod(type: KpiPeriodType, start: string) {
  return unwrap(
    api.DELETE('/v1/performance/periods/{type}/{start}/lock', {
      params: { path: { type, start } },
    }),
  )
}

export function exportXlsx(params: BoardParams) {
  return downloadFile(
    '/v1/performance/export.xlsx',
    { type: params.type, start: params.start, departmentId: params.departmentId },
    'hieu-suat-ky-thuat.xlsx',
  )
}

export function printSummaryPdf(params: BoardParams) {
  return printFile('/v1/performance/summary.pdf', {
    type: params.type,
    start: params.start,
    departmentId: params.departmentId,
  })
}
