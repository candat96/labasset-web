import { isRecord } from '@/lib/audit-entity'
import * as maps from '@/lib/status-maps'
import type { StatusMap } from '@/components/status-badge'
import * as enums from '@/lib/enum-labels'

/** Tên trường Việt hoá cho tóm tắt thay đổi trong audit (không có → giữ key). */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Tên',
  code: 'Mã',
  status: 'Trạng thái',
  statusNote: 'Ghi chú trạng thái',
  departmentId: 'Khoa/Phòng ban',
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
  closedAt: 'Đóng lúc',
  completedAt: 'Hoàn thành lúc',
  startedAt: 'Bắt đầu lúc',
  acceptedAt: 'Tiếp nhận lúc',
  acceptedByDeptAt: 'Khoa nghiệm thu lúc',
  submittedAt: 'Gửi lúc',
  approvedAt: 'Duyệt lúc',
  issuedAt: 'Cấp lúc',
  postedAt: 'Ghi sổ lúc',
  cancelledAt: 'Huỷ lúc',
  rating: 'Đánh giá (sao)',
  ratingNote: 'Nhận xét nghiệm thu',
  rejectedReason: 'Lý do từ chối',
  cancelReason: 'Lý do huỷ',
  reason: 'Lý do',
  errorCode: 'Mã lỗi trên máy',
  equipmentDown: 'Máy ngừng hoạt động',
  faultId: 'Lỗi (thư viện)',
  faultGroupId: 'Nhóm lỗi',
  postRepairWarrantyUntil: 'Bảo hành sau sửa',
  calibrationRequired: 'Cần kiểm định sau sửa',
  totalCost: 'Tổng chi phí',
  assistantIds: 'Người hỗ trợ',
  type: 'Loại',
  result: 'Kết quả',
  scope: 'Phạm vi',
  qtyRequested: 'SL yêu cầu',
  neededBy: 'Cần trước',
  performedAt: 'Thực hiện lúc',
  nextDueAt: 'Hạn kế tiếp',
  certificateNo: 'Số chứng nhận',
  cost: 'Chi phí',
  overallPass: 'Đạt',
  minStock: 'Tồn tối thiểu',
  maxStock: 'Tồn tối đa',
  refPrice: 'Giá tham chiếu',
  expiryDate: 'Hạn dùng',
  lotNumber: 'Số lô',
  unitCost: 'Đơn giá',
  submitDeadline: 'Hạn nộp',
  kind: 'Loại kỳ',
  year: 'Năm',
  quarter: 'Quý',
  totalEstimated: 'Tổng tiền ước',
  totalRequested: 'Tổng yêu cầu',
  totalApproved: 'Tổng duyệt',
  unitPriceEst: 'Đơn giá ước',
  unitPricePlan: 'Đơn giá kế hoạch',
  amountEst: 'Thành tiền',
  amountPlan: 'Thành tiền kế hoạch',
  decision: 'Quyết định',
  suggestedDecision: 'Gợi ý quyết định',
  unitPrice: 'Đơn giá',
  qty: 'Số lượng',
  buckets: 'Số khoảng chia',
  returnReason: 'Lý do trả lại',
  deptApprovedBy: 'Người duyệt khoa',
  deptApprovedAt: 'Duyệt khoa lúc',
  consolidatedAt: 'Tổng hợp lúc',
  qtyByBucket: 'Số lượng theo kỳ',
  approverNote: 'Ghi chú duyệt',
  lastUnitPrice: 'Đơn giá gần nhất',
  consumption12m: 'Tiêu hao 12 tháng',
  avgMonthly: 'Tiêu hao TB tháng',
  onHand: 'Tồn toàn viện',
  runwayDays: 'Số ngày dự trữ',
  skipUnsubmitted: 'Bỏ qua khoa chưa nộp',
}

/** Việt hoá giá trị enum theo tên trường (thử lần lượt các map trạng thái đã có). */
const STATUS_MAPS: StatusMap[] = [
  maps.repairStatusMap,
  maps.equipmentStatusMap,
  maps.taskStatusMap,
  maps.calibrationStatusMap,
  maps.transferStatusMap,
  maps.faultStatusMap,
  maps.stockDocStatusMap,
  maps.lotStatusMap,
  maps.qcStatusMap,
  maps.componentStatusMap,
  maps.suggestionStatusMap,
  maps.demandPeriodStatusMap,
  maps.demandRequestStatusMap,
  maps.demandDecisionMap,
  maps.commonStatusMap,
]
const VALUE_LABELS: Record<string, enums.EnumLabels[]> = {
  severity: [enums.faultSeverityLabels],
  priority: [enums.priorityLabels],
  type: [
    enums.issueTypeLabels,
    enums.receiptTypeLabels,
    enums.requestTypeLabels,
    enums.taskTypeLabels,
    enums.calibrationTypeLabels,
    enums.stocktakeTypeLabels,
    enums.alertTypeLabels,
    enums.deptTypeLabels,
  ],
  result: [enums.calibrationResultLabels],
  scope: [enums.faultScopeLabels, enums.stocktakeScopeLabels],
  source: [enums.partSourceLabels, enums.counterSourceLabels],
  roles: [enums.roleLabels],
}
function enumValue(key: string, value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (key === 'status' || key.endsWith('Status')) {
    for (const m of STATUS_MAPS) if (m[value]) return m[value]!.label
    return null
  }
  for (const m of VALUE_LABELS[key] ?? []) if (m[value]) return m[value]!
  if (key === 'resolutionType') {
    const r: Record<string, string> = {
      internal: 'Nội bộ',
      vendor: 'Thuê ngoài',
      warranty: 'Bảo hành',
      spare_equipment: 'Máy dự phòng',
    }
    return r[value] ?? null
  }
  return null
}

/** camelCase → 'Camel case' khi không có nhãn. */
function humanize(key: string): string {
  const words = key
    .replace(/Id$/, '')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const HIDDEN = new Set([
  'updatedAt',
  'createdAt',
  'version',
  'id',
  'passwordHash',
  'apiKeyEnc',
  'counts',
])

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
    const fromLabel = isRecord(relL) ? display(relL) : (enumValue(key, l) ?? display(l))
    const toLabel = isRecord(relR) ? display(relR) : (enumValue(key, r) ?? display(r))
    out.push({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? AUDIT_FIELD_LABELS[base] ?? humanize(key),
      from: fromLabel,
      to: toLabel,
    })
  }
  return out
}
