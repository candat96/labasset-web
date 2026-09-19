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

export type CatalogSlug = (typeof catalogSlugs)[number]
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
}
export interface CatalogField {
  name: string
  label: string
  type?:
    'text' | 'email' | 'url' | 'date' | 'number' | 'boolean' | 'reference' | 'severity' | 'user'
  reference?: 'departments' | 'self'
  min?: number
  max?: number
}
export interface CatalogConfig {
  title: string
  fields: CatalogField[]
}
