import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { AttachmentsPanel } from './attachments-panel'

it('shows only condition photos and opens the original image for inspection', async () => {
  server.use(
    http.get('/v1/attachments', () =>
      HttpResponse.json([
        { id: 'a1', fileId: 'f1', kind: 'photo', label: 'Tình trạng trước sửa chữa' },
        { id: 'a2', fileId: 'f2', kind: 'signature_technician', label: 'Chữ ký' },
      ]),
    ),
    http.get('/v1/files/f1/url', ({ request }) =>
      HttpResponse.json({
        url:
          new URL(request.url).searchParams.get('variant') === 'thumb'
            ? '/thumb.jpg'
            : '/original.jpg',
        expiresIn: 600,
      }),
    ),
  )
  renderWithProviders(
    <AttachmentsPanel
      entityType="repair_ticket"
      entityId="r1"
      kinds={[{ value: 'photo', label: 'Ảnh tình trạng' }]}
      canWrite={false}
      photosOnly
    />,
  )
  await userEvent.click(
    await screen.findByRole('button', { name: 'Xem ảnh Tình trạng trước sửa chữa' }),
  )
  await waitFor(() =>
    expect(
      screen
        .getAllByAltText('Tình trạng trước sửa chữa')
        .some((img) => img.getAttribute('src') === '/original.jpg'),
    ).toBe(true),
  )
  expect(screen.queryByText('Chữ ký')).not.toBeInTheDocument()
})

it.each(['repair_ticket', 'maintenance_task'])(
  'keeps %s photos scoped to the individual order',
  async (entityType) => {
    const queries: string[] = []
    const bodies: unknown[] = []
    server.use(
      http.get('/v1/attachments', ({ request }) => {
        const url = new URL(request.url)
        queries.push(`${url.searchParams.get('entityType')}/${url.searchParams.get('entityId')}`)
        return HttpResponse.json([])
      }),
      http.post('/v1/files/presign', () =>
        HttpResponse.json({ fileId: 'f1', uploadUrl: '/upload-photo', headers: {} }),
      ),
      http.put('/upload-photo', () => new HttpResponse(null, { status: 200 })),
      http.post('/v1/files/f1/complete', () => HttpResponse.json({ id: 'f1' })),
      http.post('/v1/attachments', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ id: 'a1' })
      }),
    )
    const first = renderWithProviders(
      <AttachmentsPanel
        entityType={entityType}
        entityId="order-1"
        kinds={[{ value: 'photo', label: 'Ảnh tình trạng' }]}
        canWrite
        photosOnly
      />,
    )
    await screen.findByText(/Ảnh chỉ thuộc lần xử lý này/)
    const camera = screen.getByLabelText('Chụp ảnh tình trạng')
    expect(camera).toHaveAttribute('capture', 'environment')
    await userEvent.upload(camera, new File(['photo'], 'condition.jpg', { type: 'image/jpeg' }))
    await waitFor(() =>
      expect(bodies).toEqual([{ fileId: 'f1', kind: 'photo', entityType, entityId: 'order-1' }]),
    )
    first.unmount()
    renderWithProviders(
      <AttachmentsPanel
        entityType={entityType}
        entityId="order-2"
        kinds={[{ value: 'photo', label: 'Ảnh tình trạng' }]}
        canWrite={false}
        photosOnly
      />,
    )
    await waitFor(() => expect(queries).toContain(`${entityType}/order-2`))
    expect(
      queries.every((q) => q === `${entityType}/order-1` || q === `${entityType}/order-2`),
    ).toBe(true)
    expect(screen.queryByLabelText('Chụp ảnh tình trạng')).not.toBeInTheDocument()
  },
)
