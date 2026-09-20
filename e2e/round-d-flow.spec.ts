import { expect, test, type Page } from '@playwright/test'
import { e2ePass, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

async function sessionApi(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('labasset.auth'))
  const auth = JSON.parse(raw ?? '{}') as {
    state?: { accessToken?: string; tenantId?: string; user?: { id?: string } }
  }
  const headers = {
    Authorization: `Bearer ${auth.state?.accessToken ?? ''}`,
    'X-Tenant-Id': auth.state?.tenantId ?? '',
  }
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const response = await page.request.fetch(path, { method, headers, data })
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
    return response.json() as Promise<T>
  }
  return { call, userId: auth.state?.user?.id ?? '' }
}

test('06+07: phiếu yêu cầu một phần và kiểm kê kho trên API dev thật', async ({ page }) => {
  await login(page)
  const { call, userId } = await sessionApi(page)
  const stamp = Date.now().toString().slice(-8)
  const catalog = async (name: string) => {
    const response = await call<Array<{ id: string }> | { items: Array<{ id: string }> }>(
      'GET',
      `/v1/catalogs/${name}?all=true&page=1&limit=200`,
    )
    return (Array.isArray(response) ? response : response.items)[0]!.id
  }
  const departments = await call<{ items: Array<{ id: string }> } | Array<{ id: string }>>(
    'GET',
    '/v1/departments?all=true',
  )
  const departmentId = (Array.isArray(departments) ? departments : departments.items)[0]!.id
  const unitId = await catalog('units')
  const warehouseId = await catalog('warehouses')
  const supplierId = await catalog('suppliers')
  const supplies = await Promise.all(
    [1, 2].map((index) =>
      call<{ id: string }>('POST', '/v1/supplies', {
        code: `D-${stamp}-${index}`,
        name: `VT D ${stamp} ${index}`,
        unitId,
        trackLot: true,
        trackExpiry: false,
        isActive: true,
      }),
    ),
  )
  const receipt = await call<{ id: string }>('POST', '/v1/stock/receipts', {
    type: 'purchase',
    warehouseId,
    supplierId,
    qcStatus: 'passed',
    receivedAt: new Date().toISOString(),
    items: supplies.map((supply, index) => ({
      supplyId: supply.id,
      lotNo: `DLOT-${stamp}-${index}`,
      quantity: '10',
      unitCost: '1000',
    })),
  })
  await call('POST', `/v1/stock/receipts/${receipt.id}/post`)

  let request = await call<{
    id: string
    status: string
    approvalLevels: number
    items: Array<{ id: string; qtyRequested: string }>
  }>('POST', '/v1/requests', {
    type: 'supply',
    departmentId,
    priority: 'normal',
    items: supplies.map((supply) => ({ supplyId: supply.id, qtyRequested: '3' })),
  })
  request = await call('POST', `/v1/requests/${request.id}/submit`)
  if (request.approvalLevels === 2)
    request = await call('POST', `/v1/requests/${request.id}/dept-approve`)
  request = await call('POST', `/v1/requests/${request.id}/approve`, {
    items: [
      { id: request.items[0]!.id, qtyApproved: '2' },
      { id: request.items[1]!.id, qtyApproved: '0', approverNote: 'Không cấp dòng này' },
    ],
  })
  expect(request.status).toBe('partially_approved')
  const issued = await call<{ issueId?: string; issue?: { id?: string } }>(
    'POST',
    `/v1/requests/${request.id}/issue`,
    { warehouseId, items: [{ id: request.items[0]!.id, quantity: '2' }] },
  )
  const issueId = issued.issueId ?? issued.issue?.id
  expect(issueId).toBeTruthy()
  await call('POST', `/v1/stock/issues/${issueId}/post`)
  const received = await call<{ status: string }>('POST', `/v1/requests/${request.id}/receive`, {})
  expect(received.status).toBe('received')

  const stocktake = await call<{ id: string }>('POST', '/v1/stocktakes', {
    name: `Kiểm kê D ${stamp}`,
    type: 'supply',
    scopeType: 'warehouse',
    scopeId: warehouseId,
  })
  await call('POST', `/v1/stocktakes/${stocktake.id}/assign`, {
    assignments: [{ userId, subScope: { warehouseIds: [warehouseId] } }],
  })
  await call('POST', `/v1/stocktakes/${stocktake.id}/open`)
  await call('POST', `/v1/stocktakes/${stocktake.id}/start-counting`)
  const pkg = await call<{
    items: Array<{ itemId?: string; id?: string; lotId?: string; bookQty?: string }>
  }>('GET', `/v1/stocktakes/${stocktake.id}/package`)
  const first = pkg.items[0]!
  const counts = await call<{ accepted: number; extras: string[] }>(
    'POST',
    `/v1/stocktakes/${stocktake.id}/counts`,
    {
      counts: [
        {
          clientId: crypto.randomUUID(),
          itemId: first.itemId ?? first.id,
          lotId: first.lotId,
          countedQty: first.bookQty ?? '0',
          countedAt: new Date().toISOString(),
        },
        {
          clientId: crypto.randomUUID(),
          lotNo: `EXTRA-${stamp}`,
          countedQty: '1',
          countedAt: new Date().toISOString(),
        },
      ],
    },
  )
  expect(counts.accepted).toBeGreaterThan(0)
  const extras = await call<
    Array<{ id: string; status: string }> | { items: Array<{ id: string; status: string }> }
  >('GET', `/v1/stocktakes/${stocktake.id}/extras`)
  const extra = (Array.isArray(extras) ? extras : extras.items).find(
    (item) => item.status === 'pending',
  )
  if (extra)
    await call('POST', `/v1/stocktakes/${stocktake.id}/extras/${extra.id}/resolve`, {
      ignore: true,
    })
  await page.goto(`/stocktakes/${stocktake.id}`)
  await expect(page.getByRole('heading', { name: `Kiểm kê D ${stamp}` })).toBeVisible()
})
