import { api, authHeaders, baseUrl, unwrapAs } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { components } from '@/api/schema'

/**
 * Kiểu mẫu chứng từ sao chép từ `labasset-api/src/documents/doc-template.types.ts`.
 *
 * Web và API không dùng chung gói kiểu, mà OpenAPI khai `body` của mẫu là object rỗng
 * (`Record<string, never>`) nên trình soạn mẫu không thể dựa vào schema sinh tự động.
 * Khai lại ở đây để mọi thao tác sửa khối đều có kiểu; khi API đổi thì sửa theo file gốc.
 */
export type PageSetup = {
  size: 'A4' | 'A5' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margin: { top: number; right: number; bottom: number; left: number }
  baseFontSize: number
}

export type ColumnFormat = 'text' | 'number' | 'money' | 'date' | 'datetime'

export type TableColumn = {
  key: string
  label: string
  width: number
  align?: 'left' | 'right' | 'center'
  format?: ColumnFormat
  sum?: boolean
}

/** Ô chữ ký: toạ độ tính bằng điểm, gốc góc dưới-trái theo chuẩn PDF. */
export type SignatureBoxSpec = {
  slot: 'handler' | 'department' | 'leader' | 'accounting'
  role: string
  page: 'last' | number
  x: number
  y: number
  w: number
  h: number
  showDate?: boolean
  hint?: string
}

export type Block =
  | {
      type: 'header'
      logo: 'left' | 'center' | 'right' | 'none'
      lines: string[]
      barcode?: { source: string; symbology: 'code128' | 'qr' }
      sideLines?: string[]
    }
  | { type: 'title'; text: string; subtitle?: string; align: 'left' | 'center' }
  | {
      type: 'fields'
      columns: 1 | 2 | 3
      items: { label: string; value: string }[]
    }
  | {
      type: 'table'
      source: string
      columns: TableColumn[]
      groupBy?: string
      showTotals?: boolean
      totalsLabel?: string
    }
  | {
      type: 'text'
      text: string
      italic?: boolean
      bold?: boolean
      align?: 'left' | 'center' | 'right'
    }
  | { type: 'signatures'; boxes: SignatureBoxSpec[] }
  | { type: 'spacer'; height: number }
  | { type: 'divider' }
  | { type: 'footer'; left?: string; right?: string; showPageNumber: boolean }

export type DocTemplateBody = { pageSetup: PageSetup; blocks: Block[] }

export type DocTemplateSource = 'tenant' | 'builtin'
export type DocTemplateSummary = components['schemas']['DocTemplateSummaryDto']

/** Bản chi tiết đang có hiệu lực; `body` thay bằng kiểu thật thay vì object rỗng của OpenAPI. */
export type DocTemplateDetail = Omit<components['schemas']['DocTemplateDetailDto'], 'body'> & {
  body: DocTemplateBody
}

export const docTemplateKeys = {
  all: ['doc-templates'] as const,
  detail: (docType: string) => ['doc-templates', docType] as const,
}

/** Bảy loại chứng từ kèm nguồn mẫu đang dùng (bản viện hay mẫu gốc). */
export const listDocTemplates = () =>
  unwrapAs<{ items: DocTemplateSummary[] }>(api.GET('/v1/doc-templates'))

export const getDocTemplate = (docType: string) =>
  unwrapAs<DocTemplateDetail>(
    api.GET('/v1/doc-templates/{docType}', { params: { path: { docType } } }),
  )

/** Lưu bản riêng của viện (chỉ HOSPITAL_ADMIN). */
export const saveDocTemplate = (docType: string, body: DocTemplateBody) =>
  unwrapAs<DocTemplateSummary>(
    api.PUT('/v1/doc-templates/{docType}', { params: { path: { docType } }, body }),
  )

/**
 * Dựng thử PDF từ đúng thân mẫu đang sửa trên màn quản trị.
 *
 * Gọi `fetch` trực tiếp thay vì `api.POST` vì client OpenAPI luôn đọc body dạng JSON,
 * còn endpoint này trả về nhị phân (application/pdf) — đọc sai sẽ hỏng tệp.
 */
export async function previewDocTemplate(docType: string, body: DocTemplateBody): Promise<Blob> {
  const res = await fetch(`${baseUrl}/v1/doc-templates/${encodeURIComponent(docType)}/preview`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      /* không phải JSON */
    }
    throw toApiError(res, payload)
  }
  return res.blob()
}
