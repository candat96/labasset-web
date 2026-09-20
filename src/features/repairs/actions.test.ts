import { availableStatuses, visibleRepairActions, type RepairAction } from './actions'

const assignment = (over: { userId?: string; role?: string; response?: string } = {}) => ({
  userId: 'u1',
  role: 'primary',
  response: 'accepted',
  ...over,
})

function actionsFor(
  status: string,
  roles: string[],
  over: {
    userId?: string
    assignments?: ReturnType<typeof assignment>[]
    requireAcceptance?: boolean
  } = {},
): RepairAction[] {
  return visibleRepairActions({
    status,
    roles,
    userId: over.userId ?? 'adm',
    assignments: over.assignments ?? [],
    requireAcceptance: over.requireAcceptance ?? true,
  })
}

it('shows accept for VT on new tickets and hides it for department users', () => {
  expect(actionsFor('new', ['EQUIPMENT_STAFF'])).toEqual(
    expect.arrayContaining(['accept', 'print']),
  )
  expect(actionsFor('new', ['DEPT_USER'])).toEqual(['print'])
})

it('shows assign/cancel/edit for admin before close', () => {
  const actions = actionsFor('accepted', ['HOSPITAL_ADMIN'])
  expect(actions).toEqual(
    expect.arrayContaining(['assign', 'diagnosis', 'status', 'cancel', 'edit', 'print']),
  )
  expect(actions).not.toContain('complete')
})

it('lets the accepted assignee complete from in_progress', () => {
  const actions = actionsFor('in_progress', ['EQUIPMENT_STAFF'], {
    userId: 'u1',
    assignments: [assignment()],
  })
  expect(actions).toEqual(expect.arrayContaining(['complete', 'diagnosis', 'status', 'print']))
  expect(actions).not.toContain('acceptance')
  expect(actions).not.toContain('close')
})

it('shows acceptance for department after completed', () => {
  expect(actionsFor('completed', ['DEPT_USER'])).toEqual(
    expect.arrayContaining(['acceptance', 'print']),
  )
})

it('allows admin to close completed tickets when acceptance is not required', () => {
  expect(actionsFor('completed', ['HOSPITAL_ADMIN'], { requireAcceptance: false })).toEqual(
    expect.arrayContaining(['close', 'acceptance']),
  )
  expect(actionsFor('completed', ['HOSPITAL_ADMIN'])).not.toContain('close')
})

it('shows respond when the current user has a pending assignment', () => {
  expect(
    actionsFor('accepted', ['EQUIPMENT_STAFF'], {
      userId: 'u3',
      assignments: [assignment({ userId: 'u3', role: 'assistant', response: 'pending' })],
    }),
  ).toContain('respond')
})

describe('ma trận nút theo trạng thái × vai trò (spec 03 mục B4)', () => {
  const cases: {
    status: string
    roles: string[]
    expected: RepairAction[]
    unexpected?: RepairAction[]
    over?: Parameters<typeof actionsFor>[2]
  }[] = [
    {
      status: 'new',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['accept', 'assign', 'cancel', 'edit', 'print'],
      unexpected: ['diagnosis', 'complete', 'acceptance', 'close'],
    },
    {
      status: 'new',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['accept', 'print'],
      unexpected: ['assign', 'cancel'],
    },
    { status: 'new', roles: ['DEPT_HEAD'], expected: ['print'], unexpected: ['accept', 'assign'] },
    { status: 'new', roles: ['DEPT_USER'], expected: ['print'], unexpected: ['accept', 'assign'] },
    {
      status: 'accepted',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['assign', 'diagnosis', 'status', 'cancel', 'edit', 'print'],
      unexpected: ['accept', 'complete', 'acceptance'],
    },
    {
      status: 'accepted',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['print'],
      unexpected: ['diagnosis', 'status'],
    },
    {
      status: 'accepted',
      roles: ['DEPT_USER'],
      expected: ['print'],
      unexpected: ['diagnosis', 'status'],
    },
    {
      status: 'in_progress',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['complete', 'diagnosis', 'status', 'print'],
      unexpected: ['accept', 'assign', 'cancel', 'close'],
      over: { userId: 'u1', assignments: [assignment()] },
    },
    {
      status: 'in_progress',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['print'],
      unexpected: ['complete', 'diagnosis'],
      over: { userId: 'u9', assignments: [assignment()] },
    },
    {
      status: 'awaiting_parts',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['assign', 'diagnosis', 'status', 'cancel', 'edit', 'print'],
      unexpected: ['close', 'acceptance'],
    },
    {
      status: 'awaiting_vendor',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['complete', 'diagnosis', 'status', 'print'],
      over: { userId: 'u1', assignments: [assignment({ response: 'accepted' })] },
    },
    {
      status: 'completed',
      roles: ['DEPT_HEAD'],
      expected: ['acceptance', 'print'],
      unexpected: ['complete', 'close', 'cancel'],
    },
    {
      status: 'completed',
      roles: ['DEPT_USER'],
      expected: ['acceptance', 'print'],
      unexpected: ['complete', 'close'],
    },
    {
      status: 'completed',
      roles: ['EQUIPMENT_STAFF'],
      expected: ['print'],
      unexpected: ['acceptance', 'complete'],
      over: { userId: 'u1', assignments: [assignment()] },
    },
    {
      status: 'completed',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['assign', 'acceptance', 'edit', 'print'],
      unexpected: ['close', 'cancel'],
    },
    {
      status: 'acceptance',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['assign', 'close', 'edit', 'print'],
      unexpected: ['cancel', 'acceptance'],
    },
    {
      status: 'acceptance',
      roles: ['DEPT_USER'],
      expected: ['print'],
      unexpected: ['close', 'acceptance'],
    },
    {
      status: 'closed',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['print'],
      unexpected: ['edit', 'cancel', 'assign', 'close'],
    },
    {
      status: 'cancelled',
      roles: ['HOSPITAL_ADMIN'],
      expected: ['print'],
      unexpected: ['edit', 'assign', 'close'],
    },
  ]
  it.each(cases)('$status · $roles', ({ status, roles, expected, unexpected, over }) => {
    const actions = actionsFor(status, roles, over)
    expect(actions).toEqual(expect.arrayContaining(expected))
    for (const action of unexpected ?? []) expect(actions).not.toContain(action)
  })
})

describe('availableStatuses theo repair-rules', () => {
  it('accepted chỉ sang in_progress', () => {
    expect(availableStatuses('accepted')).toEqual(['in_progress'])
  })
  it('in_progress sang chờ linh kiện / chờ thuê ngoài', () => {
    expect(availableStatuses('in_progress')).toEqual(['awaiting_parts', 'awaiting_vendor'])
  })
  it('awaiting_parts quay lại in_progress hoặc awaiting_vendor', () => {
    expect(availableStatuses('awaiting_parts')).toEqual(['in_progress', 'awaiting_vendor'])
  })
  it('awaiting_vendor quay lại in_progress hoặc awaiting_parts', () => {
    expect(availableStatuses('awaiting_vendor')).toEqual(['in_progress', 'awaiting_parts'])
  })
  it('các trạng thái khác không có lựa chọn', () => {
    for (const status of ['new', 'completed', 'acceptance', 'closed', 'cancelled'])
      expect(availableStatuses(status)).toEqual([])
  })
})
