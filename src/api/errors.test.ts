import { toApiError, messageFor, applyServerErrors } from './errors'
import '@/lib/i18n'
import type { UseFormReturn } from 'react-hook-form'

const formStub = <T extends Record<string, unknown>>(values: T, setError = vi.fn()) =>
  ({ setError, getValues: () => values }) as unknown as Pick<
    UseFormReturn<T>,
    'setError' | 'getValues'
  >

const res = (status: number) => new Response(null, { status })

it('maps api body', () => {
  const e = toApiError(res(404), { code: 'NOT_FOUND', message: 'x', details: { id: 1 } })
  expect(e.status).toBe(404)
  expect(e.code).toBe('NOT_FOUND')
  expect(e.details).toEqual({ id: 1 })
})

it('maps non-json body to HTTP_<status>', () => {
  expect(toApiError(res(502), 'bad gateway').code).toBe('HTTP_502')
})

it('messageFor uses i18n by code then message', () => {
  expect(messageFor(toApiError(res(403), { code: 'FORBIDDEN', message: 'nope' }))).toBe(
    'Bạn không có quyền thực hiện',
  )
  expect(messageFor(toApiError(res(400), { code: 'WEIRD_CODE', message: 'server said' }))).toBe(
    'server said',
  )
  expect(messageFor(new TypeError('Failed to fetch'))).toBe('Không kết nối được máy chủ')
})

it('applyServerErrors sets field errors from class-validator strings', () => {
  const setError = vi.fn()
  const form = formStub({ code: '', name: '' }, setError)
  const e = toApiError(res(400), {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: [
      'code must match /^[A-Z0-9_-]{1,32}$/ regular expression',
      'name should not be empty',
      'foo is bad',
    ],
  })
  expect(applyServerErrors(form, e)).toBe(true)
  expect(setError).toHaveBeenCalledWith('code', {
    type: 'server',
    message: 'code must match /^[A-Z0-9_-]{1,32}$/ regular expression',
  })
  expect(setError).toHaveBeenCalledWith('name', {
    type: 'server',
    message: 'name should not be empty',
  })
  expect(setError).toHaveBeenCalledWith('root.server', { type: 'server', message: 'foo is bad' })
})

it('applyServerErrors accepts object details', () => {
  const setError = vi.fn()
  const form = formStub({ code: '' }, setError)
  applyServerErrors(
    form,
    toApiError(res(400), { code: 'VALIDATION_ERROR', message: '', details: { code: 'trùng' } }),
  )
  expect(setError).toHaveBeenCalledWith('code', { type: 'server', message: 'trùng' })
})

it('applyServerErrors returns false for non-validation', () => {
  expect(
    applyServerErrors(formStub({}), toApiError(res(409), { code: 'CONFLICT', message: '' })),
  ).toBe(false)
})
