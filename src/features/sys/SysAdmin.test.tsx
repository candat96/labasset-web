import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { useSysAuthStore } from '@/stores/sys-auth.store'
import { Component as Hospitals } from './hospitals/pages/HospitalsPage'
import { Component as HospitalForm } from './hospitals/pages/HospitalFormPage'
import { Component as HospitalDetail } from './hospitals/pages/HospitalDetailPage'
import { Component as Migrations } from './migrations/pages/MigrationsPage'
import { Component as Announcements } from './announcements/pages/SysAnnouncementsPage'
import { Component as Stats } from './stats/pages/SysStatsPage'
import { Component as Jobs } from './jobs/pages/SysJobsPage'

const hospital = {
  id: 'h1',
  code: 'BVDEMO',
  name: 'Bệnh viện Demo',
  status: 'active',
  statusMessage: null,
  plan: 'standard',
  maxUsers: 50,
  licenseExpiresAt: null,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  migrations: { pending: [], error: undefined },
  usage: null,
  provisionJobs: [],
}

beforeEach(() => {
  useSysAuthStore.getState().setSession({
    accessToken: 'SYS1',
    user: { id: 's1', username: 'sys', fullName: 'System' },
  })
})

it('lists hospitals', async () => {
  server.use(
    http.get('/sys/hospitals', () =>
      HttpResponse.json({ items: [hospital], total: 1, page: 1, limit: 20 }),
    ),
  )
  renderWithProviders(<Hospitals />)
  expect(await screen.findByRole('link', { name: 'BVDEMO' })).toHaveAttribute(
    'href',
    '/sys/hospitals/h1',
  )
})

it('creates a hospital then shows the provisioned id', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/sys/hospitals', async ({ request }) => {
      saved.push(await request.json())
      expect(request.headers.get('x-tenant-id')).toBeNull()
      return HttpResponse.json({ id: 'h2', jobId: 'j1' }, { status: 202 })
    }),
  )
  const { router } = renderWithProviders(<HospitalForm />, {
    path: '/sys/hospitals/new',
    route: '/sys/hospitals/new',
    routes: [{ path: '/sys/hospitals/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.type(screen.getByLabelText('Mã'), 'newbv')
  await userEvent.type(screen.getByLabelText('Tên'), 'Viện Mới')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/sys/hospitals/h2'))
  expect(saved[0]).toMatchObject({ code: 'NEWBV', name: 'Viện Mới' })
})

it('resets admin and shows the one-time password', async () => {
  userEvent.setup()
  server.use(
    http.get('/sys/hospitals/h1', () => HttpResponse.json(hospital)),
    http.get('/sys/hospitals/h1/usage', () => HttpResponse.json([])),
    http.post('/sys/hospitals/h1/reset-admin', () =>
      HttpResponse.json({ username: 'admin', tempPassword: 'TmpSys!234' }),
    ),
  )
  renderWithProviders(<HospitalDetail />, {
    path: '/sys/hospitals/:id',
    route: '/sys/hospitals/h1',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Reset admin' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('TmpSys!234')).toBeVisible()
})

it('runs all migrations after confirm', async () => {
  const ran: string[] = []
  server.use(
    http.get('/sys/migrations/status', () =>
      HttpResponse.json([{ id: 'h1', code: 'BVDEMO', pending: ['AddX'], error: undefined }]),
    ),
    http.post('/sys/migrations/run-all', () => {
      ran.push('all')
      return HttpResponse.json([{ id: 'h1', code: 'BVDEMO', ok: true, ran: ['AddX'] }])
    }),
  )
  renderWithProviders(<Migrations />)
  expect(await screen.findByText('AddX')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Chạy tất cả' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(ran).toEqual(['all']))
})

it('creates a system announcement', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/sys/announcements', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/sys/announcements', async ({ request }) => {
      saved.push(await request.json())
      return HttpResponse.json({ id: 'n1' }, { status: 201 })
    }),
  )
  renderWithProviders(<Announcements />)
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm thông báo' }))
  const form = within(screen.getByRole('dialog'))
  await userEvent.type(form.getByLabelText('Tiêu đề'), 'Bảo trì')
  await userEvent.type(form.getByLabelText('Nội dung'), 'Tối nay')
  await userEvent.type(form.getByLabelText('Bắt đầu'), '2026-09-19T10:00')
  await userEvent.click(form.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ title: 'Bảo trì', body: 'Tối nay' }))
})

it('renders stats KPI cards', async () => {
  server.use(
    http.get('/sys/stats', () =>
      HttpResponse.json({
        hospitals: 3,
        byStatus: { active: 2, suspended: 1 },
        users: '12',
        storageBytes: '1024',
        sampledHospitals: 2,
      }),
    ),
  )
  renderWithProviders(<Stats />)
  expect(await screen.findByText('3')).toBeVisible()
  expect(screen.getByText('12')).toBeVisible()
})

it('runs a job immediately', async () => {
  const ran: string[] = []
  server.use(
    http.get('/sys/jobs', () =>
      HttpResponse.json({
        items: [],
        jobs: ['audit.prune'],
        running: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
    ),
    http.post('/sys/jobs/:name/run', ({ params }) => {
      ran.push(String(params.name))
      return HttpResponse.json([])
    }),
  )
  renderWithProviders(<Jobs />)
  await userEvent.click(await screen.findByRole('button', { name: 'Chạy audit.prune' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(ran).toEqual(['audit.prune']))
})
