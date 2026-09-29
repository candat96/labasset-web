import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { DiagnosisDialog } from './DiagnosisDialog'

beforeEach(() => {
  server.use(
    http.get('/v1/faults/suggest', () =>
      HttpResponse.json([
        {
          fault: {
            id: 'f1',
            title: 'Tắc kim hút',
            errorCode: 'E-02',
            severity: 'high',
            steps: ['Tháo kim', 'Rửa bằng dung dịch'],
          },
          occurrences: { onEquipment: 2, sameModel: 5 },
        },
      ]),
    ),
    http.get('/v1/catalogs/fault-groups', () => HttpResponse.json({ items: [] })),
  )
})

it('bấm chẩn đoán gợi ý thì điền luôn vào ô chẩn đoán', async () => {
  renderWithProviders(
    <DiagnosisDialog
      id="r1"
      equipmentId="e1"
      errorCode="E-02"
      description="khong hut"
      defaultFaultId={null}
      onClose={vi.fn()}
      onDone={vi.fn()}
    />,
  )

  await userEvent.click(await screen.findByRole('button', { name: /Tắc kim hút/ }))

  await waitFor(() => {
    const box = screen.getByRole('textbox', { name: /chẩn đoán/i })
    expect(box).toHaveValue('Tắc kim hút\nTháo kim\nRửa bằng dung dịch')
  })
})
