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
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const href = URL.createObjectURL(pdf)
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  // Khung phải có kích thước thật và nằm ngoài màn hình. Chrome không vẽ PDF
  // trong iframe 1px / opacity:0 / display:none — hộp thoại in ra trang trắng.
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0'
  const cleanup = () => {
    frame.remove()
    URL.revokeObjectURL(href)
  }
  frame.onload = () => {
    // onload của plugin PDF thường tới trước khi trang vẽ xong
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
  frame.src = href
}
