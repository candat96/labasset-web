import i18n from '@/lib/i18n'
import { MENU, EXTRA_ITEMS, findMenuItem } from './menu'

it('finds longest matching item', () => {
  expect(findMenuItem('/admin/departments/abc')?.item.path).toBe('/admin/departments')
  expect(findMenuItem('/')?.item.path).toBe('/')
  expect(findMenuItem('/stock/receipts')?.item.path).toBe('/stock/receipts')
  expect(findMenuItem('/stock')?.item.path).toBe('/stock')
  expect(findMenuItem('/nope')).toBeNull()
  expect(findMenuItem('/sessions')?.item.path).toBe('/sessions')
})

it('has translations for every label', () => {
  for (const g of MENU) {
    expect(i18n.exists(g.labelKey), g.labelKey).toBe(true)
    for (const it of g.items) expect(i18n.exists(it.labelKey), it.labelKey).toBe(true)
  }
  for (const it of EXTRA_ITEMS) expect(i18n.exists(it.labelKey), it.labelKey).toBe(true)
})

it('has unique paths', () => {
  const paths = [...MENU.flatMap((g) => g.items), ...EXTRA_ITEMS].map((i) => i.path)
  expect(new Set(paths).size).toBe(paths.length)
})
