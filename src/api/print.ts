import { authHeaders, baseUrl } from './client'
import { toApiError } from './errors'

type Params = Record<string, string | number | boolean | undefined | null>

async function fetchBlob(path: string, params: Params): Promise<Blob> {
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
  return res.blob()
}

/**
 * Lấy PDF từ API (kèm token) rồi mở hộp thoại in của trình duyệt —
 * không lưu file xuống máy.
 */
export async function printFile(path: string, params: Params = {}): Promise<void> {
  printBlob(await fetchBlob(path, params))
}

/**
 * In PDF bằng hộp thoại in của trình duyệt qua iframe ẩn.
 * Trình duyệt chặn in PDF nhúng → mở tab xem PDF để người dùng tự bấm in.
 */
export function printBlob(blob: Blob): void {
  const href = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  // 1px trong suốt (không display:none): Firefox/Safari cần iframe hiển thị mới dựng PDF
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0'
  const cleanup = () => {
    frame.remove()
    URL.revokeObjectURL(href)
  }
  frame.onload = () => {
    // chờ trình xem PDF dựng xong trước khi gọi hộp thoại in
    window.setTimeout(() => {
      let printed = false
      try {
        const win = frame.contentWindow
        win?.focus()
        win?.print()
        printed = true
        win?.addEventListener('afterprint', cleanup)
      } catch {
        /* trình duyệt chặn in PDF nhúng — xử lý bên dưới */
      }
      if (!printed) {
        // mở tab xem PDF để người dùng tự bấm in (Ctrl+P)
        window.open(href, '_blank', 'noopener')
        return
      }
      // Firefox/Safari không phát afterprint — dọn iframe sau khi người dùng in xong
      window.setTimeout(cleanup, 5 * 60_000)
    }, 300)
  }
  document.body.append(frame)
}
