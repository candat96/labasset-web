// TODO(api): GET /v1/settings chưa có response schema trong OpenAPI.
export type Settings = Record<string, unknown>

export type NumberingType =
  | 'equipment'
  | 'repair'
  | 'maintenance'
  | 'calibration'
  | 'stock_receipt'
  | 'stock_issue'
  | 'stock_transfer'
  | 'request'
  | 'stocktake'

export const NUMBER_TYPES: readonly NumberingType[] = [
  'equipment',
  'repair',
  'maintenance',
  'calibration',
  'stock_receipt',
  'stock_issue',
  'stock_transfer',
  'request',
  'stocktake',
]

export const NUMBER_DEFAULTS: Record<NumberingType, string> = {
  equipment: 'TB-{YYYY}-{SEQ:5}',
  repair: 'SC-{YYYY}{MM}-{SEQ:4}',
  maintenance: 'BD-{YYYY}{MM}-{SEQ:4}',
  calibration: 'KD-{YYYY}-{SEQ:4}',
  stock_receipt: 'NK-{YYYY}{MM}-{SEQ:4}',
  stock_issue: 'XK-{YYYY}{MM}-{SEQ:4}',
  stock_transfer: 'CK-{YYYY}{MM}-{SEQ:4}',
  request: 'PYC-{YYYY}{MM}-{SEQ:4}',
  stocktake: 'KK-{YYYY}-{SEQ:3}',
}

export const NUMBER_LABELS: Record<NumberingType, string> = {
  equipment: 'Thiết bị',
  repair: 'Sửa chữa',
  maintenance: 'Bảo dưỡng',
  calibration: 'Kiểm định',
  stock_receipt: 'Nhập kho',
  stock_issue: 'Xuất kho',
  stock_transfer: 'Chuyển kho',
  request: 'Phiếu yêu cầu',
  stocktake: 'Kiểm kê',
}
