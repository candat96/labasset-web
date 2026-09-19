import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './EquipmentDetailPage'

const detail = {
  id: 'e1',
  code: 'TB-1',
  name: 'Máy A',
  assetCode: null,
  model: 'X',
  serial: 'S',
  manufacturerId: null,
  manufacturer: null,
  supplierId: null,
  supplier: null,
  countryOfOrigin: null,
  manufactureYear: null,
  receivedAt: null,
  commissionedAt: null,
  fundingSourceId: null,
  fundingSource: null,
  originalValue: '1000',
  warrantyUntil: '2027-01-01',
  purchaseContractNo: null,
  decisionNo: null,
  groupId: null,
  group: null,
  departmentId: 'd1',
  department: { id: 'd1', code: 'HH', name: 'Huyết học' },
  location: 'P1',
  deptContactUserId: null,
  deptContact: null,
  staffInChargeUserId: null,
  staffInCharge: null,
  status: 'active',
  statusNote: null,
  testTypes: [],
  throughputPerHour: null,
  specs: { voltage: '220V' },
  notes: null,
  qrToken: 'tok',
  photoFileId: null,
  currentRunHours: '90',
  currentTestCount: 0,
  nextMaintenanceAt: null,
  lastMaintenanceAt: null,
  nextCalibrationAt: null,
  lastCalibrationAt: null,
  calibrationOverdue: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  network: null,
  counts: { accessories: 1, components: 1, componentsDue: 0, openRepairs: 0 },
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment/e1', () => HttpResponse.json(detail)),
    http.get('/v1/equipment/e1/accessories', () => HttpResponse.json([])),
    http.get('/v1/equipment/e1/software', () => HttpResponse.json([])),
    http.get('/v1/equipment/e1/components', () =>
      HttpResponse.json([
        {
          id: 'c1',
          equipmentId: 'e1',
          name: 'Bơm',
          componentTypeId: null,
          partNo: null,
          serial: 'P1',
          installedAt: null,
          lifespanHours: 100,
          lifespanTests: null,
          lifespanMonths: null,
          usageHoursAtInstall: '0',
          usageTestsAtInstall: 0,
          status: 'warning',
          lastNotifiedStatus: null,
          notes: null,
        },
      ]),
    ),
    http.get('/v1/equipment/e1/supplies', () => HttpResponse.json([])),
    http.get('/v1/equipment/e1/supplies/runway', () =>
      HttpResponse.json({ equipmentId: 'e1', items: [], scope: 'hospital', warehouseIds: [] }),
    ),
    http.get('/v1/equipment/e1/counters', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 }),
    ),
    http.get('/v1/equipment/e1/events', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 }),
    ),
    http.get('/v1/equipment/e1/status-history', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/equipment/e1/transfers', () =>
      HttpResponse.json({
        items: [
          {
            id: 't1',
            equipmentId: 'e1',
            fromDepartmentId: 'd1',
            toDepartmentId: 'd2',
            fromLocation: null,
            toLocation: null,
            reason: 'Chuyển khoa',
            requestedBy: 'u2',
            approvedBy: null,
            status: 'pending',
            transferredAt: null,
            minutesFileId: null,
            note: null,
            createdAt: '2026-09-19T00:00:00Z',
            attachments: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
    http.get('/v1/maintenance/tasks', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 }),
    ),
    http.get('/v1/calibrations/equipment/e1/history', () => HttpResponse.json([])),
    http.get('/v1/audit-logs/entity/equipment/e1', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/attachments', () => HttpResponse.json([])),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
  )
})

it('shows component usedPct progress', async () => {
  renderWithProviders(<Component />, {
    path: '/equipment/:id',
    route: '/equipment/e1?tab=components',
  })
  expect(await screen.findByText('Bơm')).toBeVisible()
  const bar = await screen.findByTestId('usedpct-c1')
  expect(bar).toHaveStyle({ width: '90%' })
})

it('approves a pending transfer', async () => {
  const called: string[] = []
  server.use(
    http.post('/v1/equipment/e1/transfers/t1/approve', () => {
      called.push('ok')
      return HttpResponse.json({ id: 't1', status: 'approved' })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/:id',
    route: '/equipment/e1?tab=transfers',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Duyệt' }))
  await waitFor(() => expect(called).toEqual(['ok']))
})
