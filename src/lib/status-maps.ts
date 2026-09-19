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
