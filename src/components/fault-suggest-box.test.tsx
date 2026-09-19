import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { FaultSuggestBox } from './fault-suggest-box'

it('renders suggestion cards and returns the selected fault id', async () => {
  const onSelect = vi.fn()
  server.use(
    http.get('/v1/faults/suggest', () =>
      HttpResponse.json([
        {
          matchedBy: 'errorCode',
          score: 10,
          occurrences: { onEquipment: 2, sameModel: 5 },
          fault: {
            id: 'f1',
            title: 'Không hút mẫu',
            errorCode: 'E-01',
            severity: 'high',
            scope: 'model',
            status: 'published',
            model: 'XN-1000',
            helpfulCount: 1,
            viewCount: 3,
            version: 1,
            updatedAt: '2026-09-19T00:00:00Z',
            steps: [],
          },
        },
      ]),
    ),
  )
  renderWithProviders(
    <FaultSuggestBox equipmentId="e1" errorCode="E-01" q="hut" onSelect={onSelect} />,
  )
  await userEvent.click(await screen.findByRole('button', { name: /Không hút mẫu/ }))
  expect(onSelect).toHaveBeenCalledWith('f1')
  expect(screen.getByText(/đã gặp 2 lần trên máy này \/ 5 lần cùng model/)).toBeVisible()
})
