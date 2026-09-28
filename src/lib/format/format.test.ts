import { formatDate, formatDateTime } from './date'
import { formatNumber, trimDecimal } from './number'

it('formats dates in vi style', () => {
  expect(formatDate('2026-09-19T10:00:00Z')).toBe('19/09/2026')
  expect(formatDateTime(new Date(2026, 8, 19, 8, 5))).toBe('08:05 19/09/2026')
  expect(formatDate(null)).toBe('')
  expect(formatDate('garbage')).toBe('')
})
it('formats numbers with vi grouping', () => {
  expect(formatNumber(1234.5, 1)).toBe('1.234,5')
  expect(formatNumber('1000')).toBe('1.000')
})

describe('trimDecimal', () => {
  it('cắt đuôi số 0 của numeric từ API', () => {
    expect(trimDecimal('100.0000')).toBe('100')
    expect(trimDecimal('80.50')).toBe('80.5')
    expect(trimDecimal('0.3330')).toBe('0.333')
    expect(trimDecimal('250.000')).toBe('250')
  })

  it('giữ nguyên chuỗi không phải số và giá trị rỗng', () => {
    expect(trimDecimal(null)).toBe('')
    expect(trimDecimal(undefined)).toBe('')
    expect(trimDecimal('')).toBe('')
    expect(trimDecimal('—')).toBe('—')
    expect(trimDecimal('1000')).toBe('1000')
    expect(trimDecimal(12.5)).toBe('12.5')
  })
})
