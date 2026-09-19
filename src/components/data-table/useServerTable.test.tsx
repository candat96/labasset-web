import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { useServerTable } from './useServerTable'

const wrap = (initial = '/list') => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  )
  return Wrapper
}

it('has defaults', () => {
  const { result } = renderHook(() => useServerTable(), { wrapper: wrap() })
  expect(result.current.params).toMatchObject({ page: 1, limit: 20, q: '' })
  expect(result.current.queryParams).toEqual({ page: 1, limit: 20 })
})

it('reads from URL', () => {
  const { result } = renderHook(() => useServerTable({ filterKeys: ['isActive'] }), {
    wrapper: wrap('/list?page=2&limit=50&q=xn&isActive=true&sort=name&order=desc'),
  })
  expect(result.current.params).toMatchObject({
    page: 2,
    limit: 50,
    q: 'xn',
    sort: 'name',
    order: 'desc',
    filters: { isActive: 'true' },
  })
  expect(result.current.queryParams).toEqual({
    page: 2,
    limit: 50,
    q: 'xn',
    sort: 'name',
    order: 'desc',
    isActive: 'true',
  })
})

it('debounces q and resets page', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useServerTable(), { wrapper: wrap('/list?page=3') })
  act(() => result.current.setQ('abc'))
  expect(result.current.params.q).toBe('')
  act(() => {
    vi.advanceTimersByTime(300)
  })
  expect(result.current.params.q).toBe('abc')
  expect(result.current.params.page).toBe(1)
  vi.useRealTimers()
})

it('limit/filter change resets page', () => {
  const { result } = renderHook(() => useServerTable({ filterKeys: ['isActive'] }), {
    wrapper: wrap('/list?page=3'),
  })
  act(() => result.current.setLimit(50))
  expect(result.current.params).toMatchObject({ page: 1, limit: 50 })
  act(() => result.current.setPage(4))
  act(() => result.current.setFilter('isActive', 'false'))
  expect(result.current.params.page).toBe(1)
  expect(result.current.params.filters.isActive).toBe('false')
  act(() => result.current.setFilter('isActive', undefined))
  expect(result.current.params.filters.isActive).toBeUndefined()
})

it('setSort toggles and clears', () => {
  const { result } = renderHook(() => useServerTable(), { wrapper: wrap() })
  act(() => result.current.setSort('name', 'asc'))
  expect(result.current.queryParams).toMatchObject({ sort: 'name', order: 'asc' })
  act(() => result.current.setSort(undefined))
  expect(result.current.queryParams.sort).toBeUndefined()
})
