import { auditActionLabels, enumLabel } from './enum-labels'

/** Giữ export cũ; nhãn thật nằm ở `enum-labels.ts` (đủ mọi `@Audited` của API). */
export const AUDIT_ACTIONS = auditActionLabels
export function auditActionLabel(action: string) {
  return enumLabel('auditAction', action)
}
