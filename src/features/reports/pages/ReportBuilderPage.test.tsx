import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './ReportBuilderPage'

it('uses type-specific operators and sends the complete builder body', async () => {
  let saved: Record<string, unknown> | undefined
  server.use(
    http.get('/v1/reports/sources', () =>
      HttpResponse.json([
        {
          source: 'equipment',
          label: 'Thiết bị',
          fields: {
            code: { type: 'string', label: 'Mã' },
            originalValue: { type: 'number', label: 'Nguyên giá' },
          },
        },
      ]),
    ),
    http.post('/v1/reports/custom', async ({ request }) => {
      saved = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(
        { id: 'r1', ...saved, updatedAt: '2026-09-20T00:00:00Z' },
        { status: 201 },
      )
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />)
  await user.type(await screen.findByLabelText('Tên'), 'Báo cáo máy')
  await user.click(screen.getByRole('button', { name: /Thêm lọc/ }))
  expect(screen.getByRole('option', { name: 'like' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(saved).toMatchObject({
    name: 'Báo cáo máy',
    source: 'equipment',
    columns: ['code', 'name'],
    filters: [{ field: 'code', op: 'eq', value: '' }],
  })
})
