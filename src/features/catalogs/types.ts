import type { EnumKind } from '@/lib/enum-labels'

export const catalogSlugs = [
  'suppliers',
  'manufacturers',
  'equipment-groups',
  'supply-groups',
  'units',
  'warehouses',
  'funding-sources',
  'connection-types',
  'component-types',
  'calibration-agencies',
  'fault-groups',
] as const

/** `rooms` có trang riêng `/admin/rooms` (không nằm trong Danh mục) nhưng dùng chung API catalog. */
export type CatalogSlug = (typeof catalogSlugs)[number] | 'rooms'
export type CatalogValue = string | number | boolean | null
export interface CatalogRow {
  id: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
  sortOrder?: number
  [key: string]: CatalogValue | undefined
}
export interface CatalogPageResult {
  items: CatalogRow[]
  total: number
  page: number
  limit: number
}
export interface ImportResult {
  created: number
  updated: number
  errors: { row: number; field?: string; message: string }[]
  /** Mã server tự sinh cho dòng để trống Mã (handoff 16) — API trả khi có. */
  createdCodes?: string[]
}
export interface CatalogField {
  name: string
  type?:
    | 'text'
    | 'email'
    | 'url'
    | 'date'
    | 'number'
    | 'boolean'
    | 'reference'
    | 'severity'
    | 'user'
    | 'enum'
  reference?: 'departments' | 'self'
  /** `type: 'reference'` khoa: cho phép để trống với nhãn riêng (vd "Dùng chung"). */
  nullLabelKey?: string
  /** `type: 'enum'`: giá trị + nhãn qua `enumLabel(enumKind, value)`. */
  options?: readonly string[]
  enumKind?: EnumKind
  min?: number
  max?: number
  /** Các trường cùng `listGroup` gộp thành một cột (nhãn `catalogFields.<slug>.<listGroup>`). */
  listGroup?: string
}
export interface CatalogConfig {
  fields: CatalogField[]
  /** Bộ lọc Khoa/Phòng ban trên danh sách (`?departmentId=`). */
  filterDepartment?: boolean
}
