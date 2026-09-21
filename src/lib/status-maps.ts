import type { StatusMap } from '@/components/status-badge'
export const commonStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  new: { label: 'Mới', tone: 'muted' },
  active: { label: 'Hoạt động', tone: 'success' },
  inactive: { label: 'Ngưng hoạt động', tone: 'muted' },
  pending: { label: 'Chờ xử lý', tone: 'warning' },
  running: { label: 'Đang chạy', tone: 'info' },
  success: { label: 'Thành công', tone: 'success' },
  failed: { label: 'Thất bại', tone: 'danger' },
  provisioning: { label: 'Đang khởi tạo', tone: 'info' },
  suspended: { label: 'Tạm khoá', tone: 'warning' },
  cancelled: { label: 'Đã huỷ', tone: 'muted' },
  posted: { label: 'Đã ghi sổ', tone: 'success' },
}

export const equipmentStatusMap: StatusMap = {
  active: { label: 'Hoạt động', tone: 'success' },
  broken: { label: 'Hỏng', tone: 'danger' },
  awaiting_parts: { label: 'Chờ linh kiện', tone: 'warning' },
  suspended: { label: 'Tạm ngưng', tone: 'muted' },
  retired: { label: 'Ngừng sử dụng', tone: 'muted' },
  disposed: { label: 'Thanh lý', tone: 'muted' },
}

export const accessoryConditionMap: StatusMap = {
  good: { label: 'Tốt', tone: 'success' },
  worn: { label: 'Mòn', tone: 'warning' },
  broken: { label: 'Hỏng', tone: 'danger' },
}

export const componentStatusMap: StatusMap = {
  ok: { label: 'OK', tone: 'success' },
  warning: { label: 'Cảnh báo', tone: 'warning' },
  due: { label: 'Đến hạn', tone: 'danger' },
  replaced: { label: 'Đã thay', tone: 'muted' },
}

export const transferStatusMap: StatusMap = {
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  approved: { label: 'Đã duyệt', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
  cancelled: { label: 'Đã huỷ', tone: 'muted' },
}

export const faultStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  published: { label: 'Đã ban hành', tone: 'success' },
  archived: { label: 'Lưu trữ', tone: 'muted' },
}

export const faultSeverityMap: StatusMap = {
  low: { label: 'Thấp', tone: 'success' },
  medium: { label: 'Trung bình', tone: 'warning' },
  high: { label: 'Cao', tone: 'warning' },
  critical: { label: 'Nghiêm trọng', tone: 'danger' },
}

export const suggestionStatusMap: StatusMap = {
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  accepted: { label: 'Đã chấp nhận', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
}

export const repairStatusMap: StatusMap = {
  new: { label: 'Mới', tone: 'muted' },
  accepted: { label: 'Đã tiếp nhận', tone: 'info' },
  in_progress: { label: 'Đang xử lý', tone: 'info' },
  awaiting_parts: { label: 'Chờ linh kiện', tone: 'warning' },
  awaiting_vendor: { label: 'Chờ thuê ngoài', tone: 'warning' },
  completed: { label: 'Hoàn thành', tone: 'success' },
  acceptance: { label: 'Đã nghiệm thu', tone: 'success' },
  closed: { label: 'Đóng', tone: 'muted' },
  cancelled: { label: 'Huỷ', tone: 'danger' },
}

export const partSourceMap: StatusMap = {
  stock: { label: 'Kho', tone: 'info' },
  purchased: { label: 'Mua ngoài', tone: 'warning' },
  component_replace: { label: 'Thay linh kiện', tone: 'muted' },
}

export const costCategoryMap: StatusMap = {
  parts: { label: 'Linh kiện', tone: 'info' },
  labor: { label: 'Nhân công', tone: 'info' },
  service: { label: 'Dịch vụ', tone: 'info' },
  transport: { label: 'Vận chuyển', tone: 'muted' },
  other: { label: 'Khác', tone: 'muted' },
}

export const assignmentResponseMap: StatusMap = {
  pending: { label: 'Chờ phản hồi', tone: 'warning' },
  accepted: { label: 'Đã nhận', tone: 'success' },
  declined: { label: 'Từ chối', tone: 'danger' },
}

export const taskStatusMap: StatusMap = {
  scheduled: { label: 'Đã lên lịch', tone: 'muted' },
  in_progress: { label: 'Đang làm', tone: 'info' },
  done: { label: 'Xong', tone: 'success' },
  skipped: { label: 'Bỏ qua', tone: 'muted' },
  overdue: { label: 'Quá hạn', tone: 'danger' },
}

export const taskTypeMap: StatusMap = {
  periodic: { label: 'Định kỳ', tone: 'info' },
  adhoc: { label: 'Đột xuất', tone: 'warning' },
  vendor_visit: { label: 'Nhà thầu', tone: 'muted' },
}

export const calibrationStatusMap: StatusMap = {
  scheduled: { label: 'Đã lên lịch', tone: 'muted' },
  done: { label: 'Xong', tone: 'success' },
  cancelled: { label: 'Huỷ', tone: 'danger' },
}

export const calibrationResultMap: StatusMap = {
  pass: { label: 'Đạt', tone: 'success' },
  fail: { label: 'Không đạt', tone: 'danger' },
  conditional: { label: 'Có điều kiện', tone: 'warning' },
}

export const calibrationTypeMap: StatusMap = {
  inspection: { label: 'Kiểm định', tone: 'info' },
  calibration: { label: 'Hiệu chuẩn', tone: 'info' },
}

export const stockDocStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  posted: { label: 'Đã ghi sổ', tone: 'success' },
  cancelled: { label: 'Huỷ', tone: 'danger' },
}

export const lotStatusMap: StatusMap = {
  available: { label: 'Khả dụng', tone: 'success' },
  quarantine: { label: 'Cách ly', tone: 'warning' },
  expired: { label: 'Hết hạn', tone: 'danger' },
  disposed: { label: 'Huỷ', tone: 'muted' },
}

export const qcStatusMap: StatusMap = {
  pending: { label: 'Chờ QC', tone: 'warning' },
  passed: { label: 'Đạt', tone: 'success' },
  failed: { label: 'Không đạt', tone: 'danger' },
}

export const alertTypeMap: StatusMap = {
  low_stock: { label: 'Dưới tồn min', tone: 'warning' },
  expiring: { label: 'Sắp hết hạn', tone: 'warning' },
  expired: { label: 'Hết hạn', tone: 'danger' },
  open_vial_expiring: { label: 'Lọ mở sắp hết', tone: 'warning' },
  stale: { label: 'Tồn lâu', tone: 'muted' },
}

export const requestStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  submitted: { label: 'Đã gửi', tone: 'info' },
  dept_approved: { label: 'Trưởng khoa đã duyệt', tone: 'info' },
  approved: { label: 'Đã duyệt', tone: 'success' },
  partially_approved: { label: 'Duyệt một phần', tone: 'warning' },
  rejected: { label: 'Từ chối', tone: 'danger' },
  issued: { label: 'Đã cấp phát', tone: 'success' },
  received: { label: 'Đã nhận', tone: 'success' },
  cancelled: { label: 'Huỷ', tone: 'muted' },
  converted: { label: 'Đã chuyển sửa chữa', tone: 'info' },
}

export const stocktakeStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  open: { label: 'Đã chụp sổ', tone: 'info' },
  counting: { label: 'Đang đếm', tone: 'info' },
  review: { label: 'Rà soát', tone: 'warning' },
  closed: { label: 'Đã chốt', tone: 'success' },
  cancelled: { label: 'Huỷ', tone: 'danger' },
}

export const jobStatusMap: StatusMap = {
  queued: { label: 'Chờ', tone: 'muted' },
  running: { label: 'Đang chạy', tone: 'info' },
  done: { label: 'Xong', tone: 'success' },
  failed: { label: 'Lỗi', tone: 'danger' },
}

export const demandPeriodStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  collecting: { label: 'Đang nhận', tone: 'info' },
  consolidating: { label: 'Đang tổng hợp', tone: 'warning' },
  approved: { label: 'Đã duyệt', tone: 'success' },
  closed: { label: 'Đã đóng', tone: 'muted' },
  cancelled: { label: 'Đã huỷ', tone: 'danger' },
}

export const demandRequestStatusMap: StatusMap = {
  draft: { label: 'Nháp', tone: 'muted' },
  submitted: { label: 'Đã gửi', tone: 'info' },
  dept_approved: { label: 'Trưởng khoa đã duyệt', tone: 'info' },
  returned: { label: 'Bị trả lại', tone: 'danger' },
  accepted: { label: 'Đã tiếp nhận', tone: 'success' },
}

export const demandDecisionMap: StatusMap = {
  buy: { label: 'Cần mua', tone: 'info' },
  from_stock: { label: 'Lấy từ kho', tone: 'success' },
  reject: { label: 'Không duyệt', tone: 'danger' },
}
