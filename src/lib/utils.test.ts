import { cn } from './utils'

it('merges tailwind classes', () => {
  expect(cn('p-2', 'p-4')).toBe('p-4')
})
