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
