import type { CatalogConfig, CatalogSlug } from './types'

export const catalogConfigs: Record<CatalogSlug, CatalogConfig> = {
  suppliers: {
    title: 'Nhà cung cấp',
    fields: [
      { name: 'contactName', label: 'Người liên hệ' },
      { name: 'contactPhone', label: 'Điện thoại người liên hệ' },
      { name: 'phone', label: 'Điện thoại' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Địa chỉ' },
      { name: 'taxCode', label: 'Mã số thuế' },
      { name: 'maintenanceContractNo', label: 'Số hợp đồng bảo trì' },
      { name: 'maintenanceContractExpiresAt', label: 'Hợp đồng đến ngày', type: 'date' },
      { name: 'rating', label: 'Đánh giá (1–5 sao)', type: 'number', min: 1, max: 5 },
      { name: 'notes', label: 'Ghi chú' },
    ],
  },
  manufacturers: {
    title: 'Hãng sản xuất',
    fields: [
      { name: 'country', label: 'Quốc gia' },
      { name: 'website', label: 'Website', type: 'url' },
    ],
  },
  'equipment-groups': {
    title: 'Nhóm thiết bị',
    fields: [
      { name: 'parentId', label: 'Nhóm cha', type: 'reference', reference: 'self' },
      {
        name: 'defaultMaintenanceCycleMonths',
        label: 'Chu kỳ bảo dưỡng (tháng)',
        type: 'number',
        min: 0,
      },
      {
        name: 'defaultCalibrationCycleMonths',
        label: 'Chu kỳ kiểm định (tháng)',
        type: 'number',
        min: 0,
      },
    ],
  },
  'supply-groups': {
    title: 'Nhóm vật tư',
    fields: [
      { name: 'parentId', label: 'Nhóm cha', type: 'reference', reference: 'self' },
      { name: 'requiresLot', label: 'Bắt buộc số lô', type: 'boolean' },
      { name: 'requiresExpiry', label: 'Bắt buộc hạn dùng', type: 'boolean' },
    ],
  },
  units: { title: 'Đơn vị tính', fields: [{ name: 'symbol', label: 'Ký hiệu' }] },
  warehouses: {
    title: 'Kho',
    fields: [
      {
        name: 'departmentId',
        label: 'Khoa/phòng (trống = kho trung tâm)',
        type: 'reference',
        reference: 'departments',
      },
      { name: 'address', label: 'Địa chỉ/vị trí' },
      { name: 'keeperUserId', label: 'Mã người phụ trách' },
    ],
  },
  'funding-sources': { title: 'Nguồn kinh phí', fields: [] },
  'connection-types': { title: 'Loại kết nối', fields: [] },
  'component-types': {
    title: 'Loại linh kiện',
    fields: [
      { name: 'defaultLifespanHours', label: 'Tuổi thọ mặc định (giờ)', type: 'number', min: 0 },
      {
        name: 'defaultLifespanTests',
        label: 'Tuổi thọ mặc định (lượt xét nghiệm)',
        type: 'number',
        min: 0,
      },
      { name: 'defaultLifespanMonths', label: 'Tuổi thọ mặc định (tháng)', type: 'number', min: 0 },
    ],
  },
  'calibration-agencies': {
    title: 'Đơn vị kiểm định',
    fields: [
      { name: 'address', label: 'Địa chỉ' },
      { name: 'phone', label: 'Điện thoại' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'licenseNo', label: 'Số giấy phép' },
    ],
  },
  'fault-groups': {
    title: 'Nhóm lỗi',
    fields: [
      { name: 'severity', label: 'Mức độ mặc định', type: 'severity' },
      { name: 'requiresCalibrationAfterFix', label: 'Yêu cầu kiểm định sau sửa', type: 'boolean' },
    ],
  },
}
