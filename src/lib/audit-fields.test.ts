import { describe, expect, it } from 'vitest'
import { fieldChanges, isUuid, shortenUuid } from './audit-fields'

describe('fieldChanges — nhãn trường tiếng Việt', () => {
  it('dịch tên trường đã có trong từ điển', () => {
    const change = fieldChanges(
      { status: 'new', reportedBy: 'a' },
      { status: 'in_progress', reportedBy: 'b' },
    )![0]!
    expect(change.label).toBe('Trạng thái')
  })

  it('dịch giá trị trạng thái qua bảng trạng thái', () => {
    const change = fieldChanges({ status: 'new' }, { status: 'in_progress' })![0]!
    expect(change.from).toBe('Mới')
    expect(change.to).toBe('Đang xử lý')
  })

  it('dịch nhãn trường tiếng Anh từng lọt ra (performedByUserId, dueAtOverridden)', () => {
    const changes = fieldChanges(
      { performedByUserId: null, dueAtOverridden: false },
      { performedByUserId: 'x', dueAtOverridden: true },
    )!
    const byKey = new Map(changes.map((c) => [c.key, c.label]))
    expect(byKey.get('performedByUserId')).toBe('Người thực hiện')
    expect(byKey.get('dueAtOverridden')).toBe('Gia hạn xử lý')
  })

  it('trường lạ không có trong từ điển thì KHÔNG in camelCase thô', () => {
    const change = fieldChanges({ someWeirdFieldName: 'a' }, { someWeirdFieldName: 'b' })![0]!
    expect(change.label).toBe('Some weird field name')
    expect(change.label).not.toBe('someWeirdFieldName')
  })
})

describe('fieldChanges — giá trị UUID tham chiếu', () => {
  const faultId = 'c6225ea1-0000-4000-8000-000000000001'
  const groupId = 'eca494ad-0000-4000-8000-000000000002'
  const assignee = 'e8117d70-8ffc-4fac-a913-89cd2e382859'
  const resolve = (id: string): string | undefined =>
    ({
      [faultId]: 'Lỗi bơm ly tâm',
      [groupId]: 'Nhóm lỗi cơ khí',
      [assignee]: 'Lê Hoàng Cường',
    })[id]

  it('tra tên cho trường tham chiếu khi có bảng tra', () => {
    const changes = fieldChanges(
      { faultId: null, faultGroupId: null, assigneeId: null },
      { faultId, faultGroupId: groupId, assigneeId: assignee },
      resolve,
    )!
    const byKey = new Map(changes.map((c) => [c.key, c]))
    expect(byKey.get('faultId')?.to).toBe('Lỗi bơm ly tâm')
    expect(byKey.get('faultGroupId')?.to).toBe('Nhóm lỗi cơ khí')
    expect(byKey.get('assigneeId')?.to).toBe('Lê Hoàng Cường')
  })

  it('quan hệ kèm sẵn trong bản ghi được hiện tên (một bên UUID, một bên object)', () => {
    const oldAssignee = '11111111-0000-4000-8000-000000000009'
    const change = fieldChanges(
      { assigneeId: oldAssignee },
      { assigneeId: assignee, assignee: { id: assignee, fullName: 'Lê Hoàng Cường' } },
    )![0]!
    expect(change.from).toBe(shortenUuid(oldAssignee))
    expect(change.to).toBe('Lê Hoàng Cường')
  })

  it('không tra được tên thì rút gọn, KHÔNG in nguyên UUID', () => {
    const change = fieldChanges({ faultId: null }, { faultId }, () => undefined)![0]!
    expect(change.to).toBe(shortenUuid(faultId))
    expect(change.to).not.toBe(faultId)
  })
})

describe('isUuid / shortenUuid', () => {
  it('nhận đúng UUID và không nhận chuỗi thường', () => {
    expect(isUuid('c6225ea1-0000-4000-8000-000000000001')).toBe(true)
    expect(isUuid('in_progress')).toBe(false)
    expect(isUuid('')).toBe(false)
  })
})
