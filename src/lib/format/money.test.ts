import { formatVnd } from './money'

it('formats integer string with dot grouping', () => {
  expect(formatVnd('1250000')).toBe('1.250.000 ₫')
})
it('keeps meaningful decimals with comma', () => {
  expect(formatVnd('1250000.50')).toBe('1.250.000,5 ₫')
  // Decimal(19,4) của API: bỏ đuôi 0 vô nghĩa ("0.0000" → "0")
  expect(formatVnd('0.0000')).toBe('0 ₫')
})
it('handles negative and empty', () => {
  expect(formatVnd('-1000')).toBe('-1.000 ₫')
  expect(formatVnd('')).toBe('')
  expect(formatVnd(null)).toBe('')
})
it('does not lose precision for big values', () => {
  expect(formatVnd('12345678901234567890')).toBe('12.345.678.901.234.567.890 ₫')
})
it('can omit symbol', () => {
  expect(formatVnd('5000', { symbol: false })).toBe('5.000')
})
