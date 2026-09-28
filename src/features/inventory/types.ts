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
  // Hồ sơ vật tư tiêu hao chi tiết (Task 2). Mọi trường nullable.
  circulationNumber: string | null
  circulationValidTo: string | null
  riskClass: 'A' | 'B' | 'C' | 'D' | null
  countryOfOrigin: string | null
  insuranceCode: string | null
  insuranceName: string | null
  insuranceRate: string | null
  insurancePrice: string | null
  bidPackage: string | null
  bidDecisionNo: string | null
  bidPrice: string | null
  bidValidTo: string | null
  purchaseUnitId: string | null
  conversionFactor: string | null
  minShelfLifeDays: number | null
  countCycleDays: number | null
  updatedAt?: string
}

export type Receipt = components['schemas']['ReceiptResponseDto']
export type Issue = components['schemas']['IssueResponseDto']
export type Balance = components['schemas']['StockBalanceResponseDto']
