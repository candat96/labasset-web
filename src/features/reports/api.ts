// TODO(api): D1 reports chưa có trong OpenAPI. Hợp đồng handoff/04-D1-reports.md.
import { untypedApi, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { isApiError } from '@/api/errors'
import { pageQuery } from '@/api/paths'
import { dayRangeToIso } from '@/lib/format/date-range'

const { GET: get, POST: post, PATCH: patch } = untypedApi

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

export type ReportColumnType = 'string' | 'number' | 'money' | 'date' | 'datetime' | 'percent'

export interface ReportColumn {
  key: string
  title: string
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

export interface CustomReport {
  id: string
  name: string
  source: string
  shared: boolean
  updatedAt: string
  ownerName?: string
}

export type CustomAggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max'

export interface CustomReportFilter {
  field: string
  op: string
  value: string
  valueTo?: string
}

export interface CustomReportDefinition {
  id?: string
  name: string
  shared: boolean
  source: string
  columns: string[]
  filters: CustomReportFilter[]
  groupBy: string[]
  aggregates: { field: string; fn: CustomAggregateFn }[]
  sort?: { field: string; dir: 'asc' | 'desc' } | null
}

export interface ReportPreview {
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
  truncated: boolean
}

export interface ReportJob {
  id: string
  key?: string
  name?: string
  format: string
  status: 'queued' | 'running' | 'done' | 'failed'
  createdAt: string
  finishedAt?: string | null
  error?: string | null
  fileId?: string | null
  downloadUrl?: string | null
  rowCount?: number | null
}

export interface ReportJobPage {
  items: ReportJob[]
  total: number
  page: number
  limit: number
}

export interface ReportSourceField {
  type: 'string' | 'number' | 'date' | 'enum' | 'uuid' | 'boolean'
  label: string
  enum?: string[]
}

export interface ReportSource {
  source: string
  label: string
  fields: Record<string, ReportSourceField>
}

const dateFromTo: JsonObjectSchema['properties'] = {
  from: { type: 'string', format: 'date', title: 'Từ ngày' },
  to: { type: 'string', format: 'date', title: 'Đến ngày' },
}

export const REPORTS: ReportMeta[] = [
  {
    key: 'equipment_status',
    title: 'Hiện trạng thiết bị',
    group: 'Thiết bị',
    params: {
      type: 'object',
      properties: {
        ...dateFromTo,
        q: { type: 'string', title: 'Từ khóa' },
        departmentId: {
          type: 'string',
          format: 'uuid',
          title: 'Khoa',
          'x-ref': 'departmentId',
        },
        status: {
          type: 'string',
          title: 'Trạng thái',
          enum: ['active', 'broken', 'awaiting_parts', 'retired'],
        },
        includeRetired: { type: 'boolean', title: 'Gồm máy ngừng sử dụng' },
      },
    },
    columns: [
      { key: 'code', title: 'Mã' },
      { key: 'name', title: 'Tên' },
      { key: 'status', title: 'Trạng thái' },
    ],
  },
  {
    key: 'repair_cost',
    title: 'Chi phí sửa chữa',
    group: 'Sửa chữa',
    params: {
      type: 'object',
      properties: {
        ...dateFromTo,
        equipmentId: {
          type: 'string',
          format: 'uuid',
          title: 'Thiết bị',
          'x-ref': 'equipmentId',
        },
        groupBy: {
          type: 'string',
          title: 'Nhóm theo',
          enum: ['equipment', 'department', 'month'],
        },
        minCost: { type: 'integer', title: 'Chi phí tối thiểu' },
      },
    },
    columns: [
      { key: 'code', title: 'Mã' },
      { key: 'totalCost', title: 'Chi phí', type: 'money' },
    ],
  },
  {
    key: 'stock_summary',
    title: 'Tồn kho',
    group: 'Vật tư',
    params: {
      type: 'object',
      properties: {
        ...dateFromTo,
        warehouseId: {
          type: 'string',
          format: 'uuid',
          title: 'Kho',
          'x-ref': 'warehouseId',
        },
        supplyId: {
          type: 'string',
          format: 'uuid',
          title: 'Vật tư',
          'x-ref': 'supplyId',
        },
        onlyBelowMin: { type: 'boolean', title: 'Chỉ dưới mức tối thiểu' },
      },
    },
    columns: [
      { key: 'supplyCode', title: 'Mã' },
      { key: 'supplyName', title: 'Tên' },
      { key: 'qty', title: 'Tồn', type: 'number' },
      { key: 'value', title: 'Giá trị', type: 'money' },
    ],
  },
  {
    key: 'stocktake_diffs',
    title: 'Chênh lệch kiểm kê',
    group: 'Kiểm kê',
    params: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          format: 'uuid',
          title: 'Đợt kiểm kê',
          'x-ref': 'sessionId',
        },
        includeZero: { type: 'boolean', title: 'Gồm dòng không chênh' },
        minAbsDiff: { type: 'number', title: 'Chênh tối thiểu' },
      },
    },
    columns: [
      { key: 'code', title: 'Mã' },
      { key: 'name', title: 'Tên' },
      { key: 'bookQty', title: 'Sổ sách', type: 'number' },
      { key: 'countQty', title: 'Đếm', type: 'number' },
      { key: 'diff', title: 'Chênh', type: 'number' },
    ],
  },
]

export const REPORT_SOURCES: ReportSource[] = [
  {
    source: 'equipment',
    label: 'Thiết bị',
    fields: {
      code: { type: 'string', label: 'Mã' },
      name: { type: 'string', label: 'Tên' },
      model: { type: 'string', label: 'Model' },
      serial: { type: 'string', label: 'Serial' },
      status: {
        type: 'enum',
        label: 'Trạng thái',
        enum: ['active', 'broken', 'awaiting_parts', 'retired'],
      },
      departmentId: { type: 'uuid', label: 'Khoa' },
      commissionedAt: { type: 'date', label: 'Ngày đưa vào' },
      originalValue: { type: 'number', label: 'Nguyên giá' },
      location: { type: 'string', label: 'Vị trí' },
    },
  },
  {
    source: 'repairs',
    label: 'Sửa chữa',
    fields: {
      code: { type: 'string', label: 'Mã phiếu' },
      status: { type: 'enum', label: 'Trạng thái', enum: ['new', 'in_progress', 'completed'] },
      severity: { type: 'enum', label: 'Mức khẩn', enum: ['low', 'medium', 'high', 'critical'] },
      equipmentCode: { type: 'string', label: 'Mã máy' },
      departmentName: { type: 'string', label: 'Khoa' },
      createdAt: { type: 'date', label: 'Ngày tạo' },
      completedAt: { type: 'date', label: 'Ngày xong' },
      totalCost: { type: 'number', label: 'Chi phí' },
      assignedToName: { type: 'string', label: 'Người xử lý' },
    },
  },
  {
    source: 'supplies',
    label: 'Vật tư',
    fields: {
      code: { type: 'string', label: 'Mã' },
      name: { type: 'string', label: 'Tên' },
      unit: { type: 'string', label: 'Đơn vị' },
      groupName: { type: 'string', label: 'Nhóm' },
      minStock: { type: 'number', label: 'Tồn tối thiểu' },
      refPrice: { type: 'number', label: 'Giá tham chiếu' },
      isActive: { type: 'boolean', label: 'Đang dùng' },
    },
  },
  {
    source: 'stocktakes',
    label: 'Kiểm kê',
    fields: {
      code: { type: 'string', label: 'Mã đợt' },
      name: { type: 'string', label: 'Tên đợt' },
      type: { type: 'enum', label: 'Loại', enum: ['supply', 'equipment'] },
      status: { type: 'enum', label: 'Trạng thái', enum: ['draft', 'counting', 'closed'] },
      plannedAt: { type: 'date', label: 'Kế hoạch' },
      diffCount: { type: 'number', label: 'Số dòng chênh' },
    },
  },
]

const MOCK_ROWS: Record<string, Record<string, unknown>[]> = {
  equipment_status: [
    { id: 'e1', code: 'TB-001', name: 'Máy huyết học', status: 'active' },
    { id: 'e2', code: 'TB-002', name: 'Máy sinh hoá', status: 'broken' },
  ],
  repair_cost: [
    { id: 'r1', code: 'SC-001', totalCost: '1500000' },
    { id: 'r2', code: 'SC-002', totalCost: '230000' },
  ],
  stock_summary: [
    {
      id: 's1',
      supplyCode: 'HC-01',
      supplyName: 'Huyết thanh',
      qty: '12.500',
      value: '12500000',
    },
    { id: 's2', supplyCode: 'HC-02', supplyName: 'Kit PCR', qty: '3.000', value: '9000000' },
  ],
  stocktake_diffs: [
    {
      id: 'd1',
      code: 'HC-01',
      name: 'Huyết thanh',
      bookQty: '10.000',
      countQty: '9.500',
      diff: '-0.500',
    },
  ],
}

const PREVIEW_LIMIT = 500

function asList<T>(data: T[] | { items?: T[] } | null | undefined): T[] {
  if (!data) return []
  return Array.isArray(data) ? data : (data.items ?? [])
}

function isMissingReportApi(error: unknown): boolean {
  if (isApiError(error)) {
    if (
      error.code === 'REPORT_TOO_LARGE' ||
      error.code === 'REPORT_PARAMS_INVALID' ||
      error.code === 'REPORT_RANGE_TOO_WIDE' ||
      error.code === 'REPORT_FIELD_INVALID'
    ) {
      return false
    }
    return (
      error.status === 404 ||
      error.status === 405 ||
      error.status === 501 ||
      error.code === 'NOT_FOUND' ||
      error.code === 'REPORT_NOT_FOUND'
    )
  }
  return true
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
  const query = toReportQuery(params)
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

function paginateRows(key: string, page: number, limit: number): ReportRunResult {
  const meta = REPORTS.find((row) => row.key === key)
  const all = MOCK_ROWS[key] ?? []
  const start = Math.max(0, (page - 1) * limit)
  return {
    columns: meta?.columns ?? [],
    rows: all.slice(start, start + limit),
    total: all.length,
    page,
    limit,
  }
}

function mockPreview(def: CustomReportDefinition): ReportPreview {
  const source = REPORT_SOURCES.find((row) => row.source === def.source)
  const columns: ReportColumn[] = def.columns.slice(0, 20).map((key) => ({
    key,
    title: source?.fields[key]?.label ?? key,
    type: source?.fields[key]?.type === 'number' ? 'number' : 'string',
  }))
  const rows = [1, 2, 3].map((index) => {
    const row: Record<string, unknown> = { id: `p${index}` }
    for (const col of columns) {
      const field = source?.fields[col.key]
      if (field?.type === 'number') row[col.key] = String(index)
      else if (field?.type === 'boolean') row[col.key] = index === 1
      else row[col.key] = `Mẫu ${index}`
    }
    return row
  })
  return { columns, rows, truncated: false }
}

function clipPreview(result: ReportPreview): ReportPreview {
  return {
    columns: result.columns,
    rows: result.rows.slice(0, PREVIEW_LIMIT),
    truncated: result.truncated || result.rows.length > PREVIEW_LIMIT,
  }
}

export async function listReportsSafe(): Promise<ReportMeta[]> {
  try {
    const data = await unwrapAs<ReportMeta[] | { items?: ReportMeta[] }>(get('/v1/reports'))
    const items = asList(data).filter((row) => row && typeof row.key === 'string')
    return items.length > 0 ? items : REPORTS
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return REPORTS
  }
}

export async function runReport(
  key: string,
  params: ReportParamValues,
  format: 'json' | 'xlsx' | 'pdf',
  page = 1,
  limit = 20,
): Promise<ReportRunResult | void> {
  const path = `/v1/reports/${encodeURIComponent(key)}`
  if (format === 'xlsx' || format === 'pdf') {
    await downloadFile(path, toReportQuery(params, { format }), `${key}.${format}`)
    return
  }
  try {
    const data = await unwrapAs<Partial<ReportRunResult>>(
      get(path, { params: { query: toReportQuery(params, { format: 'json', page, limit }) } }),
    )
    const meta = REPORTS.find((row) => row.key === key)
    const rows = data.rows ?? []
    return {
      columns: data.columns?.length ? data.columns : (meta?.columns ?? []),
      rows,
      total: data.total ?? rows.length,
      page: data.page ?? page,
      limit: data.limit ?? limit,
    }
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return paginateRows(key, page, limit)
  }
}

export async function runReportJob(
  key: string,
  params: ReportParamValues,
  format: 'json' | 'xlsx' | 'pdf',
): Promise<{ jobId: string }> {
  return unwrapAs<{ jobId: string }>(
    post(`/v1/reports/${encodeURIComponent(key)}/run`, {
      body: { params: compactParams(params), format },
    }),
  )
}

export async function listReportJobs(
  params: {
    page?: number
    limit?: number
    status?: string
  } = {},
): Promise<ReportJobPage> {
  const empty: ReportJobPage = {
    items: [],
    total: 0,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  }
  let data: ReportJob[] | Partial<ReportJobPage>
  try {
    data = await unwrapAs<ReportJob[] | Partial<ReportJobPage>>(
      get('/v1/reports/jobs', { params: { query: pageQuery(params) } }),
    )
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return empty
  }
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: params.page ?? 1,
      limit: params.limit ?? data.length,
    }
  }
  const items = data.items ?? []
  return {
    items,
    total: data.total ?? items.length,
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? 20,
  }
}

export async function getReportJob(id: string): Promise<ReportJob> {
  return unwrapAs<ReportJob>(get(`/v1/reports/jobs/${encodeURIComponent(id)}`))
}

export async function listCustomReports(): Promise<CustomReport[]> {
  try {
    const data = await unwrapAs<CustomReport[] | { items?: CustomReport[] }>(
      get('/v1/reports/custom'),
    )
    return asList(data)
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return []
  }
}

export async function listReportSources(): Promise<ReportSource[]> {
  try {
    const data = await unwrapAs<ReportSource[] | { items?: ReportSource[] }>(
      get('/v1/reports/sources'),
    )
    const items = asList(data)
    return items.length > 0 ? items : REPORT_SOURCES
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return REPORT_SOURCES
  }
}

export async function saveCustomReport(body: CustomReportDefinition): Promise<CustomReport> {
  try {
    if (body.id) {
      return await unwrapAs<CustomReport>(
        patch(`/v1/reports/custom/${encodeURIComponent(body.id)}`, { body }),
      )
    }
    return await unwrapAs<CustomReport>(post('/v1/reports/custom', { body }))
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return {
      id: body.id ?? 'local',
      name: body.name,
      source: body.source,
      shared: body.shared,
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function previewCustomReport(body: CustomReportDefinition): Promise<ReportPreview> {
  try {
    const data = await unwrapAs<Partial<ReportPreview>>(
      post('/v1/reports/custom/preview', { body }),
    )
    return clipPreview({
      columns: data.columns ?? [],
      rows: data.rows ?? [],
      truncated: data.truncated ?? false,
    })
  } catch (error) {
    if (!isMissingReportApi(error)) throw error
    return clipPreview(mockPreview(body))
  }
}

export async function runCustomReport(
  id: string,
  format: 'xlsx' | 'pdf',
): Promise<{ jobId: string }> {
  return unwrapAs<{ jobId: string }>(
    post(`/v1/reports/custom/${encodeURIComponent(id)}/run`, {
      params: { query: { format } },
    }),
  )
}

export function paramErrorsFrom(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.code !== 'REPORT_PARAMS_INVALID') return {}
  const out: Record<string, string> = {}
  const details = error.details
  if (!Array.isArray(details)) return out
  for (const item of details) {
    if (!item || typeof item !== 'object' || !('path' in item)) continue
    const issue = item as { path: unknown; message?: string }
    const path = Array.isArray(issue.path) ? String(issue.path[0] ?? '') : ''
    if (path) out[path] = issue.message ?? 'Không hợp lệ'
  }
  return out
}
