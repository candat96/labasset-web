import type { components } from '@/api/schema'

// TODO(api): GET /v1/supplies schema bị gộp với liên kết máy–vật tư.
export interface Supply {
  id: string
  code: string
  name: string
  groupId: string | null
  unitId: string | null
  packaging: string | null
  manufacturerCode: string | null
  manufacturerId: string | null
  defaultSupplierId: string | null
  refPrice: string | null
  trackLot: boolean
  trackExpiry: boolean
  minStock: string | null
  maxStock: string | null
  openVialDays: number | null
  storageCondition: string | null
  isActive: boolean
  notes: string | null
  updatedAt?: string
}

export type Receipt = components['schemas']['ReceiptResponseDto']
export type Issue = components['schemas']['IssueResponseDto']
export type Balance = components['schemas']['StockBalanceResponseDto']
