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
  // Loại mới cho mã tự sinh khi thêm mới (handoff 16)
  | 'department'
  | 'room'
  | 'supply'
  | 'catalog.suppliers'
  | 'catalog.manufacturers'
  | 'catalog.equipment-groups'
  | 'catalog.supply-groups'
  | 'catalog.units'
  | 'catalog.warehouses'
  | 'catalog.funding-sources'
  | 'catalog.connection-types'
  | 'catalog.component-types'
  | 'catalog.calibration-agencies'
  | 'catalog.fault-groups'

/** Nhóm gốc — luôn hiển thị ở tab Đánh số. */
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

/**
 * Loại mã tự sinh mới (handoff 16) — chỉ hiện khi API đã đăng ký key
 * `numbering.<type>` trong settings (hiển thị động theo dữ liệu trả về).
 */
export const AUTO_CODE_NUMBER_TYPES: readonly NumberingType[] = [
  'department',
  'room',
  'supply',
  'catalog.suppliers',
  'catalog.manufacturers',
  'catalog.equipment-groups',
  'catalog.supply-groups',
  'catalog.units',
  'catalog.warehouses',
  'catalog.funding-sources',
  'catalog.connection-types',
  'catalog.component-types',
  'catalog.calibration-agencies',
  'catalog.fault-groups',
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
  department: 'KH-{SEQ:3}',
  room: 'PH-{SEQ:4}',
  supply: 'VT-{SEQ:5}',
  'catalog.suppliers': 'NCC-{SEQ:4}',
  'catalog.manufacturers': 'NSX-{SEQ:4}',
  'catalog.equipment-groups': 'NTB-{SEQ:3}',
  'catalog.supply-groups': 'NVT-{SEQ:3}',
  'catalog.units': 'DVT-{SEQ:3}',
  'catalog.warehouses': 'KHO-{SEQ:3}',
  'catalog.funding-sources': 'NV-{SEQ:3}',
  'catalog.connection-types': 'KN-{SEQ:3}',
  'catalog.component-types': 'LK-{SEQ:3}',
  'catalog.calibration-agencies': 'DVKD-{SEQ:3}',
  'catalog.fault-groups': 'NL-{SEQ:3}',
}

// Nhãn các loại đánh số hiển thị qua i18n (`settings:numbering.<type>`).
