import type { ChecklistItem, ResultRow } from './types'

/**
 * Mục kiểm tra của công việc khi đang sửa trên web.
 *
 * `key` là mã gửi lên API (chữ thường/số/gạch dưới, ≤32). Mục đã lưu giữ nguyên `key`
 * để kết quả đã điền không bị mồ côi; mục mới (`fresh`) được sinh lại theo nhãn cho tới
 * khi người dùng nhập kết quả. `uid` chỉ để React giữ đúng dòng khi nhãn/key đổi.
 */
export type EditableChecklistItem = {
  uid: string
  key: string
  label: string
  type: ChecklistItem['type']
  unit: string
  min: string
  max: string
  optional: boolean
  fresh: boolean
}

let uidCounter = 0
export function nextItemUid(): string {
  uidCounter += 1
  return `ci_${Date.now().toString(36)}_${uidCounter}`
}

/**
 * Sinh mã mục từ nhãn: bỏ dấu tiếng Việt, thường hoá, gom ký tự lạ thành `_`.
 * Kết quả khớp ràng buộc `/^[a-z0-9_]{1,32}$/` của API.
 */
export function slugifyItemKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

/** Mã mục chưa trùng trong cùng công việc; thêm hậu tố `_2`, `_3`… khi cần. */
export function uniqueItemKey(base: string, used: Set<string>): string {
  const root = (base || 'item').slice(0, 32)
  let key = root
  let n = 2
  while (used.has(key)) {
    const suffix = `_${n++}`
    key = `${root.slice(0, 32 - suffix.length)}${suffix}`
  }
  return key
}

/** Dữ liệu máy chủ → dòng sửa được (giữ nguyên key đã lưu). */
export function toEditableItems(items: ChecklistItem[]): EditableChecklistItem[] {
  return items.map((item) => ({
    uid: nextItemUid(),
    key: item.key,
    label: item.label,
    type: item.type,
    unit: item.unit ?? '',
    min: item.min == null ? '' : String(item.min),
    max: item.max == null ? '' : String(item.max),
    optional: !!item.optional,
    fresh: false,
  }))
}

/**
 * Dòng sửa được → body `{ items }`. Trả `null` nếu có dòng thiếu nhãn (chặn ở UI,
 * không để API báo 400).
 */
export function toChecklistItems(items: EditableChecklistItem[]): ChecklistItem[] | null {
  const out: ChecklistItem[] = []
  for (const item of items) {
    const label = item.label.trim()
    if (!label) return null
    const measure = item.type === 'measure'
    const min = measure && item.min !== '' && Number.isFinite(Number(item.min))
    const max = measure && item.max !== '' && Number.isFinite(Number(item.max))
    out.push({
      key: item.key,
      label,
      type: item.type,
      unit: measure ? item.unit.trim() || undefined : undefined,
      min: min ? Number(item.min) : undefined,
      max: max ? Number(item.max) : undefined,
      optional: item.optional,
    })
  }
  return out
}

/** Kết quả của một mục dạng chữ để hiển thị khi công việc đã hoàn thành. */
export function formatResult(item: EditableChecklistItem, result: ResultRow): string {
  if (result.value === undefined || result.value === null) return ''
  if (item.type === 'check') return result.pass ? 'Đạt' : 'Không đạt'
  if (item.type === 'measure') return `${result.value}${item.unit ? ` ${item.unit}` : ''}`
  return String(result.value)
}
