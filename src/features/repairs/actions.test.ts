import { visibleRepairActions } from './actions'

const assignment = (over: { userId?: string; role?: string; response?: string } = {}) => ({
  userId: 'u1',
  role: 'primary',
  response: 'accepted',
  ...over,
})

it('shows accept for VT on new tickets and hides it for department users', () => {
  expect(
    visibleRepairActions({
      status: 'new',
      roles: ['EQUIPMENT_STAFF'],
      userId: 'u1',
      assignments: [],
      requireAcceptance: true,
    }),
  ).toEqual(expect.arrayContaining(['accept', 'print']))
  expect(
    visibleRepairActions({
      status: 'new',
      roles: ['DEPT_USER'],
      userId: 'u2',
      assignments: [],
      requireAcceptance: true,
    }),
  ).toEqual(['print'])
})

it('shows assign/cancel/edit for admin before close', () => {
  const actions = visibleRepairActions({
    status: 'accepted',
    roles: ['HOSPITAL_ADMIN'],
    userId: 'adm',
    assignments: [],
    requireAcceptance: true,
  })
  expect(actions).toEqual(
    expect.arrayContaining(['assign', 'diagnosis', 'status', 'cancel', 'edit', 'print']),
  )
  expect(actions).not.toContain('complete')
})

it('lets the accepted assignee complete from in_progress', () => {
  const actions = visibleRepairActions({
    status: 'in_progress',
    roles: ['EQUIPMENT_STAFF'],
    userId: 'u1',
    assignments: [assignment()],
    requireAcceptance: true,
  })
  expect(actions).toEqual(expect.arrayContaining(['complete', 'diagnosis', 'status', 'print']))
  expect(actions).not.toContain('acceptance')
  expect(actions).not.toContain('close')
})

it('shows acceptance for department after completed', () => {
  expect(
    visibleRepairActions({
      status: 'completed',
      roles: ['DEPT_USER'],
      userId: 'u2',
      assignments: [],
      requireAcceptance: true,
    }),
  ).toEqual(expect.arrayContaining(['acceptance', 'print']))
})

it('allows admin to close completed tickets when acceptance is not required', () => {
  expect(
    visibleRepairActions({
      status: 'completed',
      roles: ['HOSPITAL_ADMIN'],
      userId: 'adm',
      assignments: [],
      requireAcceptance: false,
    }),
  ).toEqual(expect.arrayContaining(['close', 'acceptance']))
  expect(
    visibleRepairActions({
      status: 'completed',
      roles: ['HOSPITAL_ADMIN'],
      userId: 'adm',
      assignments: [],
      requireAcceptance: true,
    }),
  ).not.toContain('close')
})

it('shows respond when the current user has a pending assignment', () => {
  expect(
    visibleRepairActions({
      status: 'accepted',
      roles: ['EQUIPMENT_STAFF'],
      userId: 'u3',
      assignments: [assignment({ userId: 'u3', role: 'assistant', response: 'pending' })],
      requireAcceptance: true,
    }),
  ).toContain('respond')
})
