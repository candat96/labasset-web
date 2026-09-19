export const AUDIT_ACTIONS: Record<string, string> = {
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xoá',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  activate: 'Mở khoá',
  deactivate: 'Khoá',
  post: 'Ghi sổ',
  cancel: 'Huỷ',
  approve: 'Duyệt',
  reject: 'Từ chối',
  submit: 'Gửi',
  publish: 'Ban hành',
  archive: 'Lưu trữ',
  assign: 'Phân công',
  complete: 'Hoàn thành',
  close: 'Đóng',
}

export function auditActionLabel(action: string) {
  return AUDIT_ACTIONS[action] ?? action
}
