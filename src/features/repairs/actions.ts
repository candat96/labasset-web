import type { RepairAssignment } from './types'

export const REPAIR_ACTIONS = [
  'accept',
  'assign',
  'respond',
  'diagnosis',
  'status',
  'complete',
  'acceptance',
  'close',
  'cancel',
  'edit',
  'print',
] as const
export type RepairAction = (typeof REPAIR_ACTIONS)[number]

const BEFORE_COMPLETED = new Set([
  'new',
  'accepted',
  'in_progress',
  'awaiting_parts',
  'awaiting_vendor',
])
const DIAGNOSIS_STATUSES = new Set(['accepted', 'in_progress', 'awaiting_parts', 'awaiting_vendor'])
const COMPLETE_STATUSES = new Set(['in_progress', 'awaiting_parts', 'awaiting_vendor'])
const TERMINAL = new Set(['closed', 'cancelled'])

export function isRepairAssignee(
  userId: string,
  assignments: Pick<RepairAssignment, 'userId' | 'role' | 'response'>[],
) {
  return assignments.some(
    (row) => row.userId === userId && (row.role === 'primary' || row.response === 'accepted'),
  )
}

export function pendingAssignment(
  userId: string,
  assignments: Pick<RepairAssignment, 'userId' | 'response'>[],
) {
  return assignments.some((row) => row.userId === userId && row.response === 'pending')
}

export function visibleRepairActions(input: {
  status: string
  roles: string[]
  userId: string
  assignments: Pick<RepairAssignment, 'userId' | 'role' | 'response'>[]
  requireAcceptance: boolean
}): RepairAction[] {
  const isAdm = input.roles.includes('HOSPITAL_ADMIN')
  const isVt = input.roles.includes('EQUIPMENT_STAFF') || isAdm
  const isDept = input.roles.includes('DEPT_HEAD') || input.roles.includes('DEPT_USER') || isAdm
  const assignee = isRepairAssignee(input.userId, input.assignments)
  const out: RepairAction[] = ['print']
  if (input.status === 'new' && isVt) out.push('accept')
  if (isAdm && !TERMINAL.has(input.status)) out.push('assign')
  if (pendingAssignment(input.userId, input.assignments)) out.push('respond')
  if ((assignee || isAdm) && DIAGNOSIS_STATUSES.has(input.status)) {
    out.push('diagnosis')
    out.push('status')
  }
  if (assignee && COMPLETE_STATUSES.has(input.status)) out.push('complete')
  if (input.status === 'completed' && isDept) out.push('acceptance')
  if (
    isAdm &&
    (input.status === 'acceptance' || (input.status === 'completed' && !input.requireAcceptance))
  )
    out.push('close')
  if (isAdm && BEFORE_COMPLETED.has(input.status)) out.push('cancel')
  if (isAdm && !TERMINAL.has(input.status)) out.push('edit')
  return out
}
