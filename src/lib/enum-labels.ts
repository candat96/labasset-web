/**
 * Nhãn tiếng Việt tập trung cho enum hiển thị trong bảng/chi tiết (loại phiếu,
 * phạm vi, ưu tiên, đối tượng/hành động nhật ký, vai trò…). Không có trong map
 * → trả về giá trị thô (hoặc "—" khi rỗng). Các map trạng thái có badge vẫn ở
 * `status-maps.ts`; ở đây gom nhãn text để mọi cột không lộ enum thô.
 */
export type EnumLabels = Record<string, string>

export const issueTypeLabels: EnumLabels = {
  to_department: 'Cấp cho khoa',
  for_repair: 'Sửa chữa',
  for_maintenance: 'Bảo dưỡng',
  dispose: 'Huỷ vật tư',
  return_to_supplier: 'Trả nhà cung cấp',
  adjust_out: 'Điều chỉnh giảm',
  transfer_out: 'Chuyển kho',
}

export const receiptTypeLabels: EnumLabels = {
  purchase: 'Mua từ NCC',
  return_from_dept: 'Khoa trả lại',
  adjust_in: 'Điều chỉnh tăng',
  transfer_in: 'Nhận chuyển kho',
}

export const requestTypeLabels: EnumLabels = { supply: 'Vật tư/hoá chất', repair: 'Sửa chữa' }

export const priorityLabels: EnumLabels = {
  normal: 'Thường',
  urgent: 'Khẩn',
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
}

export const stocktakeTypeLabels: EnumLabels = { equipment: 'Thiết bị', supply: 'Vật tư' }
export const stocktakeScopeLabels: EnumLabels = {
  all: 'Toàn viện',
  department: 'Theo khoa',
  warehouse: 'Theo kho',
}

export const alertTypeLabels: EnumLabels = {
  low_stock: 'Dưới tồn min',
  expiring: 'Sắp hết hạn',
  expired: 'Hết hạn',
  open_vial_expiring: 'Sắp hết hạn sau mở',
  stale: 'Tồn đọng',
}
export const alertSeverityLabels: EnumLabels = {
  info: 'Thông tin',
  low: 'Thấp',
  medium: 'Trung bình',
  warning: 'Cảnh báo',
  high: 'Cao',
  critical: 'Nghiêm trọng',
}

export const taskTypeLabels: EnumLabels = {
  periodic: 'Định kỳ',
  adhoc: 'Đột xuất',
  vendor_visit: 'Nhà thầu',
}
export const calibrationTypeLabels: EnumLabels = {
  inspection: 'Kiểm định',
  calibration: 'Hiệu chuẩn',
}
export const calibrationResultLabels: EnumLabels = {
  pass: 'Đạt',
  fail: 'Không đạt',
  conditional: 'Có điều kiện',
}

export const faultScopeLabels: EnumLabels = {
  model: 'Theo model',
  group: 'Theo nhóm máy',
  all: 'Mọi máy',
}
export const faultSeverityLabels: EnumLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
}
export const repairSeverityLabels: EnumLabels = faultSeverityLabels

export const partSourceLabels: EnumLabels = {
  stock: 'Từ kho',
  purchase: 'Mua ngoài',
  vendor: 'Nhà thầu',
  warranty: 'Bảo hành',
}

export const counterSourceLabels: EnumLabels = {
  manual: 'Nhập tay',
  api: 'Tự động',
  import: 'Nhập file',
  device: 'Từ máy',
}

export const roomTypeLabels: EnumLabels = {
  lab: 'Phòng xét nghiệm',
  ward: 'Buồng bệnh',
  surgery: 'Phòng mổ',
  imaging: 'Chẩn đoán hình ảnh',
  office: 'Văn phòng',
  storage: 'Kho',
  other: 'Khác',
}
export const ROOM_TYPES = [
  'lab',
  'ward',
  'surgery',
  'imaging',
  'office',
  'storage',
  'other',
] as const

export const deptTypeLabels: EnumLabels = {
  clinical: 'Lâm sàng',
  lab: 'Xét nghiệm',
  support: 'Hỗ trợ',
  admin: 'Hành chính',
  other: 'Khác',
}

export const roleLabels: EnumLabels = {
  HOSPITAL_ADMIN: 'Quản trị viện',
  EQUIPMENT_STAFF: 'Nhân viên VT-TBYT',
  DEPT_HEAD: 'Trưởng khoa',
  DEPT_USER: 'Nhân viên khoa',
  SYS_ADMIN: 'Quản trị hệ thống',
}

/** Đối tượng trong nhật ký — lấy từ `@Audited(entityType)` của labasset-api. */
export const auditEntityTypeLabels: EnumLabels = {
  users: 'Người dùng',
  user: 'Người dùng',
  departments: 'Khoa/Phòng ban',
  department: 'Khoa/Phòng ban',
  department_quota: 'Định mức khoa',
  equipment: 'Thiết bị',
  equipment_transfer: 'Điều chuyển máy',
  equipment_software: 'Phần mềm máy',
  equipment_component: 'Linh kiện máy',
  equipment_accessory: 'Phụ kiện máy',
  repairs: 'Sửa chữa',
  repair_ticket: 'Phiếu sửa chữa',
  repair_cost: 'Chi phí sửa chữa',
  repair_part: 'Linh kiện sửa chữa',
  repair_vendor: 'Nhà thầu sửa chữa',
  fault: 'Thư viện lỗi',
  fault_suggestion: 'Đề xuất lỗi',
  maintenance_task: 'Công việc bảo dưỡng',
  maintenance_plan: 'Kế hoạch bảo dưỡng',
  checklist_template: 'Checklist mẫu',
  calendar_item: 'Lịch',
  calibration: 'Kiểm định',
  request: 'Phiếu yêu cầu',
  recurring_request: 'Yêu cầu định kỳ',
  supply: 'Vật tư',
  suppliers: 'Nhà cung cấp',
  stock_issue: 'Phiếu xuất',
  stock_receipt: 'Phiếu nhập',
  stock_transfer: 'Chuyển kho',
  stock_lot: 'Lô kho',
  demand_period: 'Kỳ dự trù',
  demand_request: 'Phiếu dự trù',
  stock_alert: 'Cảnh báo kho',
  stock_adjustment: 'Điều chỉnh tồn',
  stocktake_session: 'Kiểm kê',
  stocktake_item: 'Dòng kiểm kê',
  stocktake: 'Kiểm kê',
  report: 'Báo cáo',
  report_job: 'Tác vụ báo cáo',
  custom_report: 'Báo cáo tuỳ chỉnh',
  settings: 'Cấu hình',
  files: 'Tệp',
  attachments: 'Đính kèm',
  ai: 'Trợ lý AI',
  auth: 'Đăng nhập',
  manufacturers: 'Hãng sản xuất',
  'equipment-groups': 'Nhóm máy',
  'fault-groups': 'Nhóm lỗi',
  'component-types': 'Loại linh kiện',
  warehouses: 'Kho',
  units: 'Đơn vị tính',
  'supply-groups': 'Nhóm vật tư',
  'calibration-agencies': 'Đơn vị kiểm định',
  'funding-sources': 'Nguồn vốn',
}

/** Hành động trong nhật ký — `@Audited(_, action)` + mặc định theo method. */
export const auditActionLabels: EnumLabels = {
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xoá',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  activate: 'Mở khoá',
  deactivate: 'Khoá',
  reset_password: 'Đặt lại mật khẩu',
  'reset-password': 'Đặt lại mật khẩu',
  post: 'Ghi sổ',
  cancel: 'Huỷ',
  approve: 'Duyệt',
  approve_bulk: 'Duyệt hàng loạt',
  dept_approve: 'Khoa duyệt',
  reject: 'Từ chối',
  submit: 'Gửi duyệt',
  receive: 'Nhận',
  issue: 'Cấp phát',
  comment: 'Bình luận',
  clone: 'Nhân bản',
  publish: 'Ban hành',
  archive: 'Lưu trữ',
  feedback: 'Phản hồi',
  propose: 'Đề xuất',
  accept: 'Tiếp nhận',
  assign: 'Phân công',
  assignment_respond: 'Phản hồi phân công',
  diagnosis: 'Chẩn đoán',
  status: 'Đổi trạng thái',
  logs: 'Ghi nhật ký',
  signature: 'Ký',
  complete: 'Hoàn thành',
  acceptance: 'Nghiệm thu',
  close: 'Đóng',
  start: 'Bắt đầu',
  finish: 'Hoàn thành',
  skip: 'Bỏ qua',
  reassign: 'Giao lại',
  results: 'Lưu kết quả',
  generate: 'Sinh công việc',
  move: 'Dời lịch',
  open: 'Mở',
  start_counting: 'Bắt đầu đếm',
  counts: 'Gửi số đếm',
  review: 'Rà soát',
  resolve_extra: 'Xử lý hàng ngoài sổ',
  update_item: 'Sửa dòng',
  resolve: 'Xử lý',
  qc: 'Kiểm tra chất lượng',
  quick: 'Xuất nhanh',
  import: 'Nhập file',
  export: 'Xuất',
  run: 'Chạy',
  network: 'Cập nhật mạng',
  counter: 'Ghi bộ đếm',
  note: 'Ghi chú',
  supplies: 'Cập nhật vật tư',
  rotate_qr: 'Xoay QR',
  upgrade: 'Nâng cấp',
  reveal_license: 'Xem key bản quyền',
  replace: 'Thay thế',
  reindex: 'Lập chỉ mục',
  message: 'Nhắn tin',
  settings: 'Cấu hình',
  get: 'Xem',
}

export const demandPeriodKindLabels: EnumLabels = {
  annual: 'Kỳ năm',
  quarterly: 'Kỳ quý',
  adhoc: 'Đột xuất',
}

export const demandItemTypeLabels: EnumLabels = {
  supply: 'Vật tư/hoá chất',
  component: 'Linh kiện thay thế',
  equipment: 'Thiết bị mua mới',
  service: 'Dịch vụ',
}

export const demandPriorityLabels: EnumLabels = {
  normal: 'Thường',
  high: 'Cao',
  urgent: 'Khẩn',
}

export const demandDecisionLabels: EnumLabels = {
  buy: 'Cần mua',
  from_stock: 'Lấy từ kho',
  reject: 'Không duyệt',
}

export const demandSuggestionBasisLabels: EnumLabels = {
  consumption: 'Theo tiêu hao',
  min_stock: 'Theo tồn tối thiểu',
}

const KINDS = {
  issueType: issueTypeLabels,
  receiptType: receiptTypeLabels,
  requestType: requestTypeLabels,
  priority: priorityLabels,
  stocktakeType: stocktakeTypeLabels,
  stocktakeScope: stocktakeScopeLabels,
  alertType: alertTypeLabels,
  alertSeverity: alertSeverityLabels,
  taskType: taskTypeLabels,
  calibrationType: calibrationTypeLabels,
  calibrationResult: calibrationResultLabels,
  faultScope: faultScopeLabels,
  faultSeverity: faultSeverityLabels,
  repairSeverity: repairSeverityLabels,
  partSource: partSourceLabels,
  counterSource: counterSourceLabels,
  deptType: deptTypeLabels,
  roomType: roomTypeLabels,
  role: roleLabels,
  auditEntityType: auditEntityTypeLabels,
  auditAction: auditActionLabels,
} as const

export type EnumKind = keyof typeof KINDS

/** Nhãn cho `value` theo `kind` (tên map) hoặc map truyền trực tiếp. */
export function enumLabel(kind: EnumKind | EnumLabels, value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  const map = typeof kind === 'string' ? KINDS[kind] : kind
  return map[value] ?? value
}

/** Nhãn vai trò (giữ API cũ `useRoleLabel` trong users). */
export const roleLabel = (role: string) => enumLabel('role', role)
