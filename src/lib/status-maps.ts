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
