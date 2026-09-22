import { departmentSchema } from './schema'

const s = departmentSchema()

it('uppercases code and accepts empty phone', () => {
  const r = s.safeParse({ code: 'khoa-xn', name: 'Khoa XN', type: 'lab', phone: '' })
  expect(r.success).toBe(true)
  expect(r.data?.code).toBe('KHOA-XN')
  expect(r.data?.sortOrder).toBe(0)
  expect(r.data?.isActive).toBe(true)
})

it('accepts empty code — server tự sinh (handoff 16)', () => {
  const r = s.safeParse({ code: '', name: 'Khoa mới', type: 'lab' })
  expect(r.success).toBe(true)
  if (r.success) expect(r.data.code).toBe('')
})

it('rejects invalid code and phone', () => {
  const r = s.safeParse({ code: 'a b', name: 'X', type: 'lab', phone: 'abc' })
  expect(r.success).toBe(false)
  const paths = r.error?.issues.map((i) => i.path.join('.'))
  expect(paths).toContain('code')
  expect(paths).toContain('phone')
})

it('requires name', () => {
  const r = s.safeParse({ code: 'A', name: '', type: 'other' })
  expect(r.error?.issues[0]?.message).toBe('Bắt buộc')
})
