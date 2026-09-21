import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { server } from '@/test/msw/server'
import { Component } from './ReportsPage'

beforeEach(() => {
  const report = {
    key: 'equipment.byStatus',
    title: 'Hiện trạng thiết bị',
    group: 'equipment',
    params: {
      type: 'object',
      properties: { from: { type: 'string', format: 'date', title: 'Từ ngày' } },
    },
    columns: [{ key: 'status', title: 'Trạng thái', type: 'string' }],
  }
  server.use(
    http.get('/v1/reports', () =>
      HttpResponse.json(
        Array.from({ length: 18 }, (_, index) =>
          index === 0 ? report : { ...report, key: `report.${index}`, title: `Báo cáo ${index}` },
        ),
      ),
    ),
  )
})

it('lists contracted reports', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Hiện trạng thiết bị')).toBeVisible()
})

it('renders date params from json schema', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Hiện trạng thiết bị'))
  expect(await screen.findByLabelText('Từ ngày')).toBeVisible()
})

it('renders all 18 reports returned by the registry', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Báo cáo 17')).toBeVisible()
  expect(document.querySelectorAll('[data-testid="report-list"] button')).toHaveLength(18)
})
