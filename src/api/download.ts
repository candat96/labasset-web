import { authHeaders, baseUrl } from './client'
import { toApiError } from './errors'

type Params = Record<string, string | number | boolean | undefined | null>

/**
 * Tải tệp (xlsx/pdf) từ API kèm header xác thực, rồi kích hoạt lưu về máy.
 * Tên tệp lấy từ Content-Disposition nếu có.
 */
export async function downloadFile(
  path: string,
  params: Params = {},
  fallbackName = 'download',
): Promise<void> {
  const url = new URL(path, baseUrl)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      /* không phải JSON */
    }
    throw toApiError(res, body)
  }
  const blob = await res.blob()
  saveBlob(blob, filenameFrom(res.headers.get('content-disposition')) ?? fallbackName)
}

export function filenameFrom(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(contentDisposition)
  if (star?.[1]) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''))
  const plain = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return plain?.[1]?.trim() ?? null
}

export function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}
