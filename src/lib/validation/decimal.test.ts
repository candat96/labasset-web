import { decimalString } from './decimal'

it('accepts money scale 0 and qty scale 3', () => {
  expect(decimalString({ maxScale: 0 }).safeParse('12000').success).toBe(true)
  expect(decimalString({ maxScale: 0 }).safeParse('12.5').success).toBe(false)
  expect(decimalString({ maxScale: 3, min: '0' }).safeParse('1.250').success).toBe(true)
  expect(decimalString({ maxScale: 3, min: '0' }).safeParse('-1').success).toBe(false)
})
