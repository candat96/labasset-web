import { formatDate, formatDateTime } from './date'
import { formatNumber } from './number'

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
