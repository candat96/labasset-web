import { isRecord } from '@/lib/audit-entity'
import * as maps from '@/lib/status-maps'
import type { StatusMap } from '@/components/status-badge'
import * as enums from '@/lib/enum-labels'

/**
 * Tên trường Việt hoá cho tóm tắt thay đổi trong nhật ký. Khoá là tên trường
 * thô trong `before`/`after` (entity của API). Thiếu ở đây → `humanize` hiện
 * dạng tách từ dễ đọc, KHÔNG in nguyên `camelCase`.
 */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // Định danh & chung
  name: 'Tên',
  code: 'Mã',
  title: 'Tiêu đề',
  status: 'Trạng thái',
  statusNote: 'Ghi chú trạng thái',
  statusMessage: 'Thông báo trạng thái',
  statusBeforeRecall: 'Trạng thái trước thu hồi',
  isActive: 'Kích hoạt',
  isPrimary: 'Chính',
  isDefault: 'Mặc định',
  type: 'Loại',
  kind: 'Loại kỳ',
  source: 'Nguồn',
  sourceType: 'Loại nguồn',
  refType: 'Loại tham chiếu',
  category: 'Danh mục',
  description: 'Mô tả',
  notes: 'Ghi chú',
  note: 'Ghi chú',
  reason: 'Lý do',
  decision: 'Quyết định',
  suggestedDecision: 'Gợi ý quyết định',
  priority: 'Ưu tiên',
  severity: 'Mức độ',
  criticality: 'Mức trọng yếu',
  riskClass: 'Phân loại rủi ro',
  scope: 'Phạm vi',
  scopeType: 'Loại phạm vi',
  subScope: 'Phạm vi con',
  result: 'Kết quả',
  resolution: 'Kết quả xử lý',
  action: 'Hành động',

  // Người / vai trò
  fullName: 'Họ tên',
  username: 'Tên đăng nhập',
  email: 'Email',
  phone: 'Điện thoại',
  roles: 'Vai trò',
  role: 'Vai trò',
  user: 'Người dùng',
  userId: 'Người dùng',
  assigneeId: 'Người xử lý',
  defaultAssigneeId: 'Người xử lý mặc định',
  performedByUserId: 'Người thực hiện',
  performerName: 'Người thực hiện',
  staffInChargeUserId: 'Phụ trách VT',
  reportedBy: 'Người báo hỏng',
  reportedDepartmentId: 'Khoa báo hỏng',
  deptApprovedBy: 'Người duyệt khoa',
  deptApprovedAt: 'Duyệt khoa lúc',
  approvedBy: 'Người duyệt',
  requestedBy: 'Người yêu cầu',
  requesterId: 'Người yêu cầu',
  assignedBy: 'Người phân công',
  completedBy: 'Người hoàn thành',
  countedBy: 'Người đếm',
  reviewedBy: 'Người rà soát',
  evaluatedBy: 'Người đánh giá',
  resolvedBy: 'Người xử lý',
  issuedBy: 'Người cấp',
  receivedBy: 'Người nhận',
  postedBy: 'Người ghi sổ',
  keeperUserId: 'Người giữ',
  receiverUserId: 'Người nhận',
  deptContactUserId: 'Người liên hệ khoa',
  headUserId: 'Trưởng đơn vị',
  ownerId: 'Chủ sở hữu',
  lockedBy: 'Người khoá',
  recalledBy: 'Người thu hồi',
  changedBy: 'Người thay đổi',
  updatedBy: 'Người cập nhật',
  byUserId: 'Người thực hiện',
  assistantIds: 'Người hỗ trợ',
  contactName: 'Người liên hệ',
  contactPhone: 'Điện thoại liên hệ',

  // Khoa / phòng / địa điểm
  departmentId: 'Khoa/Phòng ban',
  fromDepartmentId: 'Khoa gửi',
  toDepartmentId: 'Khoa nhận',
  roomId: 'Phòng',
  roomType: 'Loại phòng',
  building: 'Toà nhà',
  floor: 'Tầng',
  location: 'Vị trí',
  locationId: 'Vị trí lưu trữ',
  toLocation: 'Vị trí đến',
  fromLocation: 'Vị trí đi',
  address: 'Địa chỉ',
  website: 'Website',
  taxCode: 'Mã số thuế',

  // Thiết bị
  equipmentId: 'Thiết bị',
  equipmentDown: 'Máy ngừng hoạt động',
  serialNumber: 'Serial',
  serialNo: 'Số sê-ri',
  serial: 'Serial',
  model: 'Model',
  manufacturerId: 'Hãng',
  manufactureYear: 'Năm SX',
  circulationNo: 'Số lưu hành',
  circulationNumber: 'Số lưu hành',
  circulationValidTo: 'Số lưu hành hết hiệu lực',
  origin: 'Xuất xứ',
  countryOfOrigin: 'Nước xuất xứ',
  groupId: 'Nhóm',
  fundingSourceId: 'Nguồn vốn',
  originalValue: 'Nguyên giá',
  warrantyUntil: 'Bảo hành đến',
  commissionedAt: 'Ngày đưa vào sử dụng',
  installedAt: 'Lắp đặt lúc',
  lastMaintenanceAt: 'Bảo dưỡng gần nhất',
  nextMaintenanceAt: 'Bảo dưỡng kế tiếp',
  lastCalibrationAt: 'Kiểm định gần nhất',
  nextCalibrationAt: 'Kiểm định kế tiếp',
  currentRunHours: 'Giờ chạy hiện tại',
  runHours: 'Giờ chạy',
  usageHoursAtInstall: 'Giờ chạy khi lắp',
  usageTestsAtInstall: 'Số xét nghiệm khi lắp',
  lifespanMonths: 'Tuổi thọ (tháng)',
  lifespanHours: 'Tuổi thọ (giờ)',
  lifespanTests: 'Tuổi thọ (lần xét nghiệm)',
  expectedLifeYears: 'Tuổi thọ (năm)',
  lifecycleCostEst: 'Chi phí vòng đời',
  defaultLifespanMonths: 'Tuổi thọ mặc định (tháng)',
  defaultLifespanHours: 'Tuổi thọ mặc định (giờ)',
  defaultLifespanTests: 'Tuổi thọ mặc định (lần)',
  defaultMaintenanceCycleMonths: 'Chu kỳ bảo dưỡng mặc định (tháng)',
  defaultCalibrationCycleMonths: 'Chu kỳ kiểm định mặc định (tháng)',

  // Sửa chữa
  faultId: 'Lỗi (thư viện)',
  faultGroupId: 'Nhóm lỗi',
  errorCode: 'Mã lỗi trên máy',
  dueAt: 'Hạn',
  dueAtOverridden: 'Gia hạn xử lý',
  diagnosis: 'Chẩn đoán',
  resolutionType: 'Phương án',
  resolutionSummary: 'Kết quả',
  postRepairWarrantyUntil: 'Bảo hành sau sửa',
  calibrationRequired: 'Cần kiểm định sau sửa',
  requiresCalibrationAfterFix: 'Cần kiểm định sau sửa',
  totalCost: 'Tổng chi phí',
  cost: 'Chi phí',
  costWarning: 'Cảnh báo chi phí',
  rating: 'Đánh giá (sao)',
  ratingNote: 'Nhận xét nghiệm thu',
  reviewedAt: 'Rà soát lúc',
  respondedAt: 'Phản hồi lúc',
  assignedAt: 'Phân công lúc',
  acceptedAt: 'Tiếp nhận lúc',
  acceptedByDeptAt: 'Khoa nghiệm thu lúc',
  startedAt: 'Bắt đầu lúc',
  completedAt: 'Hoàn thành lúc',
  closedAt: 'Đóng lúc',
  cancelledAt: 'Huỷ lúc',
  releasedAt: 'Phát hành lúc',
  rejectedReason: 'Lý do từ chối',
  cancelReason: 'Lý do huỷ',
  recallReason: 'Lý do thu hồi',
  returnReason: 'Lý do trả lại',
  reviewNote: 'Ghi chú rà soát',
  response: 'Phản hồi',
  responseNote: 'Ghi chú phản hồi',
  feedbackNote: 'Ghi chú phản hồi',
  durationMinutes: 'Thời lượng (phút)',
  estMinutes: 'Ước tính (phút)',
  vendorName: 'Nhà thầu',
  engineerName: 'Kỹ sư phụ trách',
  engineerPhone: 'Điện thoại kỹ sư',
  contractNo: 'Số hợp đồng',
  quotationAmount: 'Số tiền báo giá',
  invoiceNo: 'Số hoá đơn',
  invoiceDate: 'Ngày hoá đơn',
  paidAt: 'Thanh toán lúc',
  visitAt: 'Ngày đến',

  // Bảo dưỡng / kiểm định
  maintenanceTaskId: 'Công việc bảo dưỡng',
  calibrationTicketId: 'Phiếu kiểm định',
  performedAt: 'Thực hiện lúc',
  nextDueAt: 'Hạn kế tiếp',
  scheduledAt: 'Dự kiến lúc',
  notifiedDueAt: 'Nhắc đến hạn lúc',
  certificateNo: 'Số chứng nhận',
  certificateFileId: 'Tệp chứng nhận',
  findings: 'Kết quả kiểm tra',
  overallPass: 'Đạt',
  cycleMonths: 'Chu kỳ (tháng)',
  agencyId: 'Đơn vị kiểm định',
  calibrationOverdue: 'Quá hạn kiểm định',
  maintenanceContractNo: 'Số HĐ bảo dưỡng',
  maintenanceContractExpiresAt: 'HĐ bảo dưỡng hết hạn',
  templateId: 'Mẫu checklist',
  planId: 'Kế hoạch',
  planType: 'Loại kế hoạch',
  plannedAt: 'Kế hoạch lúc',
  expectedResult: 'Kết quả mong đợi',
  cautions: 'Lưu ý',
  instruction: 'Hướng dẫn',
  testTypes: 'Loại xét nghiệm',
  testRunAt: 'Chạy lúc',
  testRunBy: 'Người chạy',
  testCount: 'Số lần chạy',
  currentTestCount: 'Số lần chạy hiện tại',

  // Kho / vật tư
  supplyId: 'Vật tư',
  supplyCode: 'Mã vật tư',
  supplierId: 'Nhà cung cấp',
  componentId: 'Linh kiện',
  componentTypeId: 'Loại linh kiện',
  warehouseId: 'Kho',
  toWarehouseId: 'Kho nhận',
  fromWarehouseId: 'Kho gửi',
  stockLotId: 'Lô kho',
  lotId: 'Lô',
  lotNo: 'Số lô',
  lotNumber: 'Số lô',
  expiryDate: 'Hạn dùng',
  openExpiresAt: 'Hết hạn sau mở',
  openVialDays: 'Số ngày dùng sau mở',
  storageCondition: 'Điều kiện bảo quản',
  minShelfLifeDays: 'Hạn dùng tối thiểu (ngày)',
  minStock: 'Tồn tối thiểu',
  maxStock: 'Tồn tối đa',
  refPrice: 'Giá tham chiếu',
  unitCost: 'Đơn giá',
  unitPrice: 'Đơn giá',
  lastUnitPrice: 'Đơn giá gần nhất',
  conversionFactor: 'Hệ số quy đổi',
  quantity: 'Số lượng',
  qty: 'Số lượng',
  qtyRequested: 'SL yêu cầu',
  qtyApproved: 'SL duyệt',
  qtyIssued: 'SL cấp',
  qtyReserved: 'SL giữ chỗ',
  qtyOnHand: 'SL tồn',
  qtyByBucket: 'Số lượng theo kỳ',
  bookQty: 'SL sổ sách',
  diffQty: 'SL lệch',
  countedQty: 'SL đếm',
  fromQty: 'SL trước',
  toQty: 'SL sau',
  shortage: 'Thiếu',
  partiallyIssued: 'Cấp một phần',
  balanceAfter: 'Tồn sau',
  onHand: 'Tồn toàn viện',
  consumption12m: 'Tiêu hao 12 tháng',
  avgMonthly: 'Tiêu hao TB tháng',
  monthlyQty: 'Số lượng tháng',
  runwayDays: 'Số ngày dự trữ',
  leadTimeDays: 'Thời gian cung ứng (ngày)',
  minShelfLife: 'Hạn dùng tối thiểu',
  trackSerial: 'Theo dõi sê-ri',
  trackLot: 'Theo dõi lô',
  trackExpiry: 'Theo dõi hạn',
  requiresLot: 'Yêu cầu lô',
  requiresExpiry: 'Yêu cầu hạn dùng',
  fefoWarning: 'Cảnh báo FEFO',
  bookLocation: 'Vị trí sổ sách',
  bookLotNo: 'Số lô sổ sách',
  bookStatus: 'Trạng thái sổ sách',
  countedStatus: 'Trạng thái đếm',
  countedLocation: 'Vị trí đếm',
  countedAt: 'Đếm lúc',

  // Phiếu / chứng từ
  requestId: 'Phiếu yêu cầu',
  repairTicketId: 'Phiếu sửa chữa',
  receiptId: 'Phiếu nhập',
  issueId: 'Phiếu xuất',
  transferId: 'Phiếu chuyển kho',
  periodId: 'Kỳ',
  customReportId: 'Báo cáo tuỳ chỉnh',
  unitId: 'Đơn vị tính',
  purchaseUnitId: 'Đơn vị mua',
  fileId: 'Tệp',
  imageFileId: 'Tệp ảnh',
  documentFileId: 'Tệp tài liệu',
  minutesFileId: 'Tệp biên bản',
  diagramFileId: 'Tệp sơ đồ',
  invoiceFileId: 'Tệp hoá đơn',
  quotationFileId: 'Tệp báo giá',
  techSignatureFileId: 'Tệp chữ ký kỹ thuật',
  receiverSignatureFileId: 'Tệp chữ ký người nhận',
  deptSignatureFileId: 'Tệp chữ ký khoa',
  entityType: 'Loại đối tượng',
  entityId: 'Đối tượng',
  receivedAt: 'Ngày nhận',
  neededBy: 'Cần trước',
  submittedAt: 'Gửi lúc',
  approvedAt: 'Duyệt lúc',
  issuedAt: 'Cấp lúc',
  postedAt: 'Ghi sổ lúc',
  transferredAt: 'Điều chuyển lúc',
  replacedAt: 'Thay thế lúc',
  openedAt: 'Mở lúc',
  publishedAt: 'Ban hành lúc',
  expiresAt: 'Hết hạn',
  consolidatedAt: 'Tổng hợp lúc',
  approverNote: 'Ghi chú duyệt',
  submitDeadline: 'Hạn nộp',

  // Dự trù / kế hoạch
  year: 'Năm',
  quarter: 'Quý',
  buckets: 'Số khoảng chia',
  totalEstimated: 'Tổng tiền ước',
  totalRequested: 'Tổng yêu cầu',
  totalApproved: 'Tổng duyệt',
  unitPriceEst: 'Đơn giá ước',
  unitPricePlan: 'Đơn giá kế hoạch',
  amountEst: 'Thành tiền',
  amountPlan: 'Thành tiền kế hoạch',
  basis: 'Căn cứ',
  suggestion: 'Đề xuất',
  suggestedQty: 'SL đề xuất',
  itemType: 'Loại dòng',
  itemName: 'Tên dòng',
  itemId: 'Dòng',
  lineId: 'Dòng',
  order: 'Thứ tự',
  skipUnsubmitted: 'Bỏ qua khoa chưa nộp',
  skip: 'Bỏ qua',
  quota: 'Định mức',
  quotaExceeded: 'Vượt định mức',
  dayOfMonth: 'Ngày trong tháng',
  weekStart: 'Bắt đầu tuần',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  startsAt: 'Bắt đầu lúc',
  endsAt: 'Kết thúc lúc',

  // Đánh giá nhà cung cấp
  deliveryScore: 'Điểm giao hàng',
  qualityScore: 'Điểm chất lượng',
  supportScore: 'Điểm hỗ trợ',
  techScore: 'Điểm kỹ thuật',
  totalScore: 'Tổng điểm',
  score: 'Điểm',
  bidPrice: 'Giá thầu',
  bidPackage: 'Gói thầu',
  bidDecisionNo: 'Số quyết định thầu',
  bidValidTo: 'Hiệu lực thầu',
  decisionNo: 'Số quyết định',
  purchaseContractNo: 'Số HĐ mua',
  evaluatedAt: 'Đánh giá lúc',
  evaluationType: 'Loại đánh giá',

  // Khác
  insuranceCode: 'Mã BHYT',
  insuranceName: 'Tên BHYT',
  insurancePrice: 'Giá BHYT',
  insuranceRate: 'Tỷ lệ BHYT',
  licenseNo: 'Số giấy phép',
  licenseExpiresAt: 'Giấy phép hết hạn',
  providerKey: 'Khoá nhà cung cấp',
  symptoms: 'Triệu chứng',
  causes: 'Nguyên nhân',
  content: 'Nội dung',
  comment: 'Bình luận',
  data: 'Dữ liệu',
  value: 'Giá trị',
  valueTo: 'Giá trị đến',
  fromStatus: 'Trạng thái trước',
  toStatus: 'Trạng thái sau',
  fromDepartment: 'Khoa đi',
  toDepartment: 'Khoa đến',
  toRoom: 'Phòng đến',
  replacementPartId: 'Linh kiện thay thế',
  substituteId: 'Vật tư thay thế',
  replacesEquipmentId: 'Thay thế máy',
  oldSerial: 'Sê-ri cũ',
  newSerial: 'Sê-ri mới',
  hardwareChange: 'Thay đổi phần cứng',
  softwareId: 'Phần mềm',
  partNo: 'Mã linh kiện',
  inventoryNo: 'Số tồn',
  invoiceValue: 'Giá trị hoá đơn',
  usageNote: 'Ghi chú sử dụng',
  position: 'Vị trí',
  jobTitle: 'Chức danh',
  deptType: 'Loại khoa',
  recordType: 'Loại bản ghi',
  displayName: 'Tên hiển thị',
  sortOrder: 'Thứ tự hiển thị',
  settings: 'Cấu hình',
  settingKey: 'Khoá cấu hình',
  settingValue: 'Giá trị cấu hình',
  profileName: 'Tên hồ sơ',
  signatureImageFileId: 'Tệp ảnh chữ ký',
  signerTitle: 'Chức danh người ký',
  field: 'Trường',
  fromVersion: 'Phiên bản trước',
  toVersion: 'Phiên bản sau',
  diff: 'Khác biệt',
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

/** camelCase/snake_case → câu dễ đọc khi không có nhãn (không in nguyên `camelCase`). */
function humanize(key: string): string {
  const words = key
    .replace(/Ids?$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  if (!words) return key
  const lower = words.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Giá trị có phải UUID không (để tra tên tham chiếu thay vì in thô). */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Rút gọn UUID khi không tra được tên — không bao giờ in nguyên UUID. */
export function shortenUuid(id: string): string {
  return `${id.slice(0, 8)}…`
}

function short(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return shortenUuid(value)
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

/** Tra nhãn cho một UUID tham chiếu (người dùng, máy, lỗi…); trả `undefined` nếu chưa biết. */
export type ReferenceResolver = (id: string) => string | undefined

/** Chuẩn hoá giá trị để so sánh: object quan hệ {id,name…} → id; mảng object → danh sách id. */
function normalize(value: unknown): unknown {
  if (isRecord(value) && 'id' in value) return value.id
  if (Array.isArray(value)) return value.map(normalize)
  return value
}

/** Hiển thị: object quan hệ → name/title/code; còn lại như `short`. */
function display(value: unknown): string {
  if (isRecord(value)) {
    const name = value.name ?? value.fullName ?? value.title ?? value.code ?? value.username
    if (typeof name === 'string') return name
  }
  if (Array.isArray(value) && value.every((v) => isRecord(v)))
    return value.length === 0 ? '—' : value.map(display).join(', ')
  return short(value)
}

/** Một phía giá trị: ưu tiên object quan hệ → enum → UUID tra tên → hiển thị thường. */
function sideValue(
  key: string,
  value: unknown,
  relation: unknown,
  resolve?: ReferenceResolver,
): string {
  if (isRecord(relation)) return display(relation)
  const label = enumValue(key, value)
  if (label != null) return label
  if (Array.isArray(value) && value.length > 0 && value.every(isUuid))
    return value.map((id) => resolve?.(id) ?? shortenUuid(id)).join(', ')
  if (isUuid(value)) return resolve?.(value) ?? shortenUuid(value)
  return display(value)
}

/**
 * Danh sách thay đổi trường giữa before/after: bỏ trường kỹ thuật, bỏ object quan hệ
 * trùng với `<key>Id`, so sánh theo giá trị chuẩn hoá (object → id) để không báo giả
 * khi backend nạp quan hệ ở `after` mà không có ở `before`. `resolve` tra tên cho các
 * giá trị UUID tham chiếu; không có → rút gọn, tuyệt đối không in UUID thô.
 */
export function fieldChanges(
  before: unknown,
  after: unknown,
  resolve?: ReferenceResolver,
): FieldChange[] {
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
    out.push({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? AUDIT_FIELD_LABELS[base] ?? humanize(key),
      from: sideValue(key, l, left[base], resolve),
      to: sideValue(key, r, right[base], resolve),
    })
  }
  return out
}
