/** B2 (SCM-06) — đánh giá nhà cung cấp theo kỳ. */
export interface SupplierEvaluation {
  id: string
  supplierId: string
  periodFrom: string
  periodTo: string
  deliveryScore: number
  qualityScore: number
  documentScore: number
  supportScore: number
  /** Hệ thống tính theo trọng số trong cài đặt; không gửi từ client. */
  totalScore: number
  note: string | null
  evaluatedBy: string | null
  evaluatedAt: string
}

export interface SupplierEvaluationInput {
  periodFrom: string
  periodTo: string
  deliveryScore: number
  qualityScore: number
  documentScore: number
  supportScore: number
  note?: string | null
}

/** Số liệu hệ thống tự đo trong kỳ — chỉ để tham khảo, không tự chấm điểm. */
export interface SupplierEvaluationFacts {
  from: string | null
  to: string | null
  receiptCount: number
  qcFailedCount: number
  quarantineLotCount: number
  returnToSupplierCount: number
  shortShelfLifeLotCount: number
}

export const EVALUATION_SCORES = [
  'deliveryScore',
  'qualityScore',
  'documentScore',
  'supportScore',
] as const
export type EvaluationScoreKey = (typeof EVALUATION_SCORES)[number]
