// TODO(api): D1 reports chưa có trong OpenAPI. Hợp đồng handoff/04-D1-reports.md.

export interface ReportMeta {
  key: string
  title: string
  group: string
  params: Record<string, unknown>
  columns: { key: string; title: string; type?: string }[]
}

export interface CustomReport {
  id: string
  name: string
  source: string
  shared: boolean
  updatedAt: string
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
}

const REPORTS: ReportMeta[] = [
  {
    key: 'equipment_status',
    title: 'Hiện trạng thiết bị',
    group: 'Thiết bị',
    params: { type: 'object', properties: { from: { type: 'string', format: 'date' } } },
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
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' },
      },
    },
    columns: [
      { key: 'code', title: 'Mã' },
      { key: 'totalCost', title: 'Chi phí', type: 'money' },
    ],
  },
]

export async function listReportsSafe() {
  return REPORTS
}

export async function listCustomReports(): Promise<CustomReport[]> {
  return []
}

export async function listReportJobs(): Promise<ReportJob[]> {
  return []
}
