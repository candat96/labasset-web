import { faultPartSchema } from './schema'

const basePart = {
  name: 'Kim hút mẫu',
  note: '',
  componentTypeId: null,
  supplyId: null,
}

it('parts.quantity phải là số nguyên ≥ 1', () => {
  expect(faultPartSchema.safeParse({ ...basePart, quantity: 1 }).success).toBe(true)
  expect(faultPartSchema.safeParse({ ...basePart, quantity: 12 }).success).toBe(true)
  expect(faultPartSchema.safeParse({ ...basePart, quantity: 0 }).success).toBe(false)
  expect(faultPartSchema.safeParse({ ...basePart, quantity: 1.5 }).success).toBe(false)
  expect(faultPartSchema.safeParse({ ...basePart, quantity: -1 }).success).toBe(false)
})

it('parts.name bắt buộc', () => {
  expect(faultPartSchema.safeParse({ ...basePart, name: '  ', quantity: 1 }).success).toBe(false)
})
