// TODO(api): endpoint /v1/catalogs/storage-locations chưa có trong OpenAPI.
export interface StorageLocation {
  id: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
  sortOrder?: number
  warehouseId: string
  zone?: string | null
  parentId?: string | null
}

export interface StorageLocationPage {
  items: StorageLocation[]
  total: number
  page?: number
  limit?: number
}
