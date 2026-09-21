import { isRecord } from '@/lib/audit-entity'

/** Tên trường Việt hoá cho tóm tắt thay đổi trong audit (không có → giữ key). */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Tên',
  code: 'Mã',
  status: 'Trạng thái',
  departmentId: 'Khoa',
  location: 'Vị trí',
  serialNumber: 'Serial',
  model: 'Model',
  manufacturerId: 'Hãng',
  supplierId: 'Nhà cung cấp',
  originalValue: 'Nguyên giá',
  warrantyUntil: 'Bảo hành đến',
  commissionedAt: 'Ngày đưa vào sử dụng',
  receivedAt: 'Ngày nhận',
  staffInChargeUserId: 'Phụ trách VT',
  notes: 'Ghi chú',
  description: 'Mô tả',
  severity: 'Mức độ',
  priority: 'Ưu tiên',
  assigneeId: 'Người xử lý',
  dueAt: 'Hạn',
  diagnosis: 'Chẩn đoán',
  resolutionType: 'Phương án',
  resolutionSummary: 'Kết quả',
  quantity: 'Số lượng',
  qtyApproved: 'SL duyệt',
  qtyIssued: 'SL cấp',
  warehouseId: 'Kho',
  isActive: 'Kích hoạt',
  roles: 'Vai trò',
  email: 'Email',
  phone: 'Điện thoại',
  fullName: 'Họ tên',
  manufactureYear: 'Năm SX',
  origin: 'Xuất xứ',
  groupId: 'Nhóm',
  fundingSourceId: 'Nguồn vốn',
  lastMaintenanceAt: 'Bảo dưỡng gần nhất',
  nextMaintenanceAt: 'Bảo dưỡng kế tiếp',
  nextCalibrationAt: 'Kiểm định kế tiếp',
}

const HIDDEN = new Set(['updatedAt', 'createdAt', 'version', 'id', 'passwordHash', 'apiKeyEnc'])

function short(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    if (iso) {
      const d = new Date(value)
      return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
    }
    return value.length > 60 ? `${value.slice(0, 57)}…` : value
  }
  if (Array.isArray(value)) return value.length === 0 ? '—' : `[${value.length} mục]`
  if (isRecord(value)) return `{${Object.keys(value).length} trường}`
  return String(value)
}

export interface FieldChange {
  key: string
  label: string
  from: string
  to: string
}

/** Chuẩn hoá giá trị để so sánh: object quan hệ {id,name…} → id; mảng object → danh sách id. */
function normalize(value: unknown): unknown {
  if (isRecord(value) && 'id' in value) return value.id
  if (Array.isArray(value)) return value.map(normalize)
  return value
}

/** Hiển thị: object quan hệ → name/code; còn lại như `short`. */
function display(value: unknown): string {
  if (isRecord(value)) {
    const name = value.name ?? value.fullName ?? value.code ?? value.username
    if (typeof name === 'string') return name
  }
  if (Array.isArray(value) && value.every((v) => isRecord(v)))
    return value.length === 0 ? '—' : value.map(display).join(', ')
  return short(value)
}

/**
 * Danh sách thay đổi trường giữa before/after: bỏ trường kỹ thuật, bỏ object quan hệ
 * trùng với `<key>Id`, so sánh theo giá trị chuẩn hoá (object → id) để không báo giả
 * khi backend nạp quan hệ ở `after` mà không có ở `before`.
 */
export function fieldChanges(before: unknown, after: unknown): FieldChange[] {
  const left = isRecord(before) ? before : {}
  const right = isRecord(after) ? after : {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  const out: FieldChange[] = []
  for (const key of keys) {
    if (HIDDEN.has(key)) continue
    const l = left[key]
    const r = right[key]
    // Object quan hệ đi kèm `<key>Id` → chỉ xét khoá Id (hiển thị tên lấy từ object nếu có).
    if ((isRecord(l) || isRecord(r) || l === null || r === null) && keys.has(`${key}Id`)) continue
    // Một bên không có khoá (backend không trả) → không phải thay đổi thật.
    if (!(key in left) || !(key in right)) continue
    if (JSON.stringify(normalize(l)) === JSON.stringify(normalize(r))) continue
    const base = key.endsWith('Id') ? key.slice(0, -2) : key
    const relL = left[base]
    const relR = right[base]
    out.push({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? AUDIT_FIELD_LABELS[base] ?? key,
      from: isRecord(relL) ? display(relL) : display(l),
      to: isRecord(relR) ? display(relR) : display(r),
    })
  }
  return out
}
