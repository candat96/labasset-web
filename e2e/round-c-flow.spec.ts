import { expect, test, type Page } from '@playwright/test'
import { e2ePass, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

async function apiSession(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('labasset.auth'))
  const state = JSON.parse(raw ?? '{}') as {
    state?: { accessToken?: string; tenantId?: string }
  }
  const headers = {
    Authorization: `Bearer ${state.state?.accessToken ?? ''}`,
    'X-Tenant-Id': state.state?.tenantId ?? '',
  }
  return async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const response = await page.request.fetch(path, { method, headers, data })
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
    return response.json() as Promise<T>
  }
}

test('05 kho: nhập 2 lô → FEFO nhiều dòng → post/cancel → QC quarantine', async ({ page }) => {
  await login(page)
  const call = await apiSession(page)
  const stamp = Date.now().toString().slice(-8)

  const ensureCatalog = async (name: string, prefix: string) => {
    const listed = await call<Array<{ id: string }> | { items: Array<{ id: string }> }>(
      'GET',
      `/v1/catalogs/${name}?all=true&page=1&limit=200`,
    )
    const first = Array.isArray(listed) ? listed[0] : listed.items[0]
    if (first) return first.id
    const created = await call<{ id: string }>('POST', `/v1/catalogs/${name}`, {
      code: `${prefix}${stamp}`,
      name: `E2E ${name} ${stamp}`,
      isActive: true,
    })
    return created.id
  }
  const unitId = await ensureCatalog('units', 'DV')
  const warehouseId = await ensureCatalog('warehouses', 'K')
  const supplierId = await ensureCatalog('suppliers', 'NCC')
  const supply = await call<{ id: string }>('POST', '/v1/supplies', {
    code: `E2E-${stamp}`,
    name: `Vật tư E2E ${stamp}`,
    unitId,
    trackLot: true,
    trackExpiry: true,
    isActive: true,
  })
  const receipt = await call<{ id: string }>('POST', '/v1/stock/receipts', {
    type: 'purchase',
    warehouseId,
    supplierId,
    receivedAt: new Date().toISOString(),
    qcStatus: 'passed',
    items: [
      {
        supplyId: supply.id,
        lotNo: `FEFO-A-${stamp}`,
        expiresAt: '2027-01-01',
        quantity: '2',
        unitCost: '1000',
      },
      {
        supplyId: supply.id,
        lotNo: `FEFO-B-${stamp}`,
        expiresAt: '2027-06-01',
        quantity: '3',
        unitCost: '1000',
      },
    ],
  })
  await call('POST', `/v1/stock/receipts/${receipt.id}/post`)
  const suggestions = await call<Array<{ lotId: string; quantity: string }>>(
    'GET',
    `/v1/stock/issues/suggest-lots?supplyId=${supply.id}&warehouseId=${warehouseId}&quantity=4`,
  )
  expect(suggestions).toHaveLength(2)
  expect(suggestions.map((item) => item.quantity)).toEqual(['2.000', '2.000'])
  const issue = await call<{ id: string }>('POST', '/v1/stock/issues', {
    type: 'adjust_out',
    warehouseId,
    reason: 'E2E kiểm tra FEFO',
    issuedAt: new Date().toISOString(),
    items: suggestions.map((item) => ({
      supplyId: supply.id,
      lotId: item.lotId,
      quantity: item.quantity,
    })),
  })
  await call('POST', `/v1/stock/issues/${issue.id}/post`)
  await call('POST', `/v1/stock/issues/${issue.id}/cancel`)

  const quarantineReceipt = await call<{ id: string }>('POST', '/v1/stock/receipts', {
    type: 'purchase',
    warehouseId,
    supplierId,
    receivedAt: new Date().toISOString(),
    qcStatus: 'pending',
    items: [
      {
        supplyId: supply.id,
        lotNo: `QC-${stamp}`,
        expiresAt: '2027-12-01',
        quantity: '1',
        unitCost: '1000',
      },
    ],
  })
  await call('POST', `/v1/stock/receipts/${quarantineReceipt.id}/post`)
  await call('POST', `/v1/stock/receipts/${quarantineReceipt.id}/qc`, {
    status: 'failed',
    note: 'E2E QC không đạt',
  })
  const stock = await call<{ lots: Array<{ lotNo: string; status: string }> }>(
    'GET',
    `/v1/supplies/${supply.id}/stock`,
  )
  expect(stock.lots.find((lot) => lot.lotNo === `QC-${stamp}`)?.status).toBe('quarantine')
})
