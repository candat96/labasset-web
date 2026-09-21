import { api, apiBody, unwrap, unwrapAs, untypedApi } from '@/api/client'
import { downloadFile } from '@/api/download'
import { isApiError } from '@/api/errors'
import { dayRangeToIso } from '@/lib/format/date-range'
import type { components } from '@/api/schema'

export type JsonSchemaXRef =
  'departmentId' | 'warehouseId' | 'equipmentId' | 'supplyId' | 'sessionId'
export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  format?: string
  title?: string
  description?: string
  enum?: string[]
  default?: string | number | boolean | null
  'x-ref'?: JsonSchemaXRef | string
}
export interface JsonObjectSchema {
  type?: 'object'
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}
export type ReportParamValue = string | number | boolean | null
export type ReportParamValues = Record<string, ReportParamValue>
export type ReportColumnType = components['schemas']['ReportColumnDto']['type']
export type ReportColumn = Omit<components['schemas']['ReportColumnDto'], 'type'> & {
  type?: ReportColumnType
}
export interface ReportMeta {
  key: string
  title: string
  group: string
  params: JsonObjectSchema
  columns: ReportColumn[]
}
export interface ReportRunResult {
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}
export type CustomReport = components['schemas']['CustomReportViewDto']
export type CustomAggregateFn = components['schemas']['CustomReportAggregateDto']['fn']
export interface CustomReportFilter {
  field: string
  op: string
  value?: unknown
  valueTo?: unknown
}
export interface CustomReportDefinition {
  id?: string
  name: string
  shared: boolean
  source: 'equipment' | 'repairs' | 'stock_movements' | 'requests' | 'maintenance_tasks'
  columns: string[]
  filters: CustomReportFilter[]
  groupBy: string[]
  aggregates: { field: string; fn: CustomAggregateFn }[]
  sort?: { field: string; dir: 'asc' | 'desc' } | null
}
export type ReportPreview = components['schemas']['CustomPreviewDto']
export type ReportJob = Omit<components['schemas']['ReportJobViewDto'], 'fileId'> & {
  name?: string
  fileId?: string | null
}
export type ReportJobPage = Omit<components['schemas']['ReportJobPageDto'], 'items'> & {
  items: ReportJob[]
}
export interface ReportSourceField {
  type: 'string' | 'number' | 'date' | 'enum' | 'uuid' | 'boolean'
  label: string
  enum?: string[]
}
export interface ReportSource {
  source: CustomReportDefinition['source']
  label: string
  fields: Record<string, ReportSourceField>
}

export const REPORTS: ReportMeta[] = []

export function opsForType(type: ReportSourceField['type']): string[] {
  if (type === 'string') return ['eq', 'ne', 'like', 'in', 'isNull', 'notNull']
  if (type === 'boolean') return ['eq', 'isNull', 'notNull']
  if (type === 'enum' || type === 'uuid') return ['eq', 'ne', 'in', 'isNull', 'notNull']
  return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'notNull']
}

export function toReportQuery(
  params: ReportParamValues,
  extra: Record<string, string | number | boolean | undefined> = {},
): Record<string, string | number | boolean | undefined> {
  const range = dayRangeToIso(
    typeof params.from === 'string' && params.from ? params.from : undefined,
    typeof params.to === 'string' && params.to ? params.to : undefined,
  )
  const query: Record<string, string | number | boolean | undefined> = { ...extra }
  for (const [key, value] of Object.entries(params)) {
    if (value === '' || value == null) continue
    if (key === 'from') query.from = range.from
    else if (key === 'to') query.to = range.to
    else query[key] = value
  }
  return query
}

function compactParams(params: ReportParamValues): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(toReportQuery(params)).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
    ),
  )
}

export async function listReportsSafe(): Promise<ReportMeta[]> {
  const rows = await unwrap(api.GET('/v1/reports'))
  return rows.map((row) => ({
    ...row,
    params: row.params as JsonObjectSchema,
    columns: row.columns as ReportColumn[],
  }))
}

export async function runReport(
  key: string,
  params: ReportParamValues,
  format: 'json' | 'xlsx' | 'pdf',
  page = 1,
  limit = 20,
): Promise<ReportRunResult | void> {
  const path = `/v1/reports/${encodeURIComponent(key)}`
  if (format !== 'json') {
    await downloadFile(path, toReportQuery(params, { format }), `${key}.${format}`)
    return
  }
  return unwrapAs<ReportRunResult>(
    untypedApi.GET(path, {
      params: { query: toReportQuery(params, { format: 'json', page, limit }) },
    }),
  )
}

export function runReportJob(
  key: string,
  params: ReportParamValues,
  format: 'xlsx' | 'pdf',
): Promise<{ jobId: string }> {
  return unwrap(
    api.POST('/v1/reports/{key}/run', {
      params: { path: { key } },
      body: { params: compactParams(params), format },
    }),
  )
}

export function listReportJobs(
  params: { page?: number; limit?: number; status?: 'queued' | 'running' | 'done' | 'failed' } = {},
): Promise<ReportJobPage> {
  return unwrap(
    api.GET('/v1/reports/jobs', { params: { query: params } }),
  ) as Promise<ReportJobPage>
}

export function getReportJob(id: string): Promise<ReportJob> {
  return unwrap(
    api.GET('/v1/reports/jobs/{id}', { params: { path: { id } } }),
  ) as Promise<ReportJob>
}
export function listCustomReports(): Promise<CustomReport[]> {
  return unwrap(api.GET('/v1/reports/custom'))
}
export async function listReportSources(): Promise<ReportSource[]> {
  return (await unwrap(api.GET('/v1/reports/sources'))) as ReportSource[]
}

function customBody(body: CustomReportDefinition) {
  const payload = { ...body }
  delete payload.id
  return apiBody<components['schemas']['CustomReportBodyDto']>(payload)
}

export function saveCustomReport(body: CustomReportDefinition): Promise<CustomReport> {
  if (body.id) {
    return unwrap(
      api.PATCH('/v1/reports/custom/{id}', {
        params: { path: { id: body.id } },
        body: customBody(body),
      }),
    )
  }
  return unwrap(api.POST('/v1/reports/custom', { body: customBody(body) }))
}
export function previewCustomReport(body: CustomReportDefinition): Promise<ReportPreview> {
  return unwrap(api.POST('/v1/reports/custom/preview', { body: customBody(body) }))
}
export function runCustomReport(id: string, format: 'xlsx' | 'pdf'): Promise<{ jobId: string }> {
  return unwrap(
    api.POST('/v1/reports/custom/{id}/run', {
      params: { path: { id }, query: { format } },
    }),
  )
}

export function paramErrorsFrom(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.code !== 'REPORT_PARAMS_INVALID') return {}
  const out: Record<string, string> = {}
  if (!Array.isArray(error.details)) return out
  for (const item of error.details) {
    if (!item || typeof item !== 'object' || !('path' in item)) continue
    const issue = item as { path: unknown; message?: string }
    const path = Array.isArray(issue.path) ? String(issue.path[0] ?? '') : ''
    if (path) out[path] = issue.message ?? 'Không hợp lệ'
  }
  return out
}
