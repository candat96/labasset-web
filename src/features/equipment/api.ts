import { api, apiBody, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { apiQuery, pageQuery } from '@/api/paths'
import type { components, paths } from '@/api/schema'
import type { ReferenceOption } from '@/components/form/async-select'
import {
  EQUIPMENT_STATUSES,
  type CreateEquipment,
  type EquipmentDetail,
  type EquipmentListParams,
  type EquipmentStatus,
  type EquipmentSupplyLink,
  type UpdateEquipment,
} from './types'

type EquipmentQuery = NonNullable<paths['/v1/equipment']['get']['parameters']['query']>

export function listEquipment(params: EquipmentListParams) {
  const { status, ...rest } = params
  return unwrapAs<import('./types').EquipmentPage>(
    api.GET('/v1/equipment', {
      params: {
        query: apiQuery<EquipmentQuery>({
          ...rest,
          // API nhận `status` dạng mảng (query "a,b" cũng được @Transform tách).
          status: status ? status.split(',').filter(isEquipmentStatus) : undefined,
          export: undefined,
        }),
      },
    }),
  )
}

const isEquipmentStatus = (value: string): value is EquipmentStatus =>
  (EQUIPMENT_STATUSES as string[]).includes(value)

export function getEquipment(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}', { params: { path: { id } } }))
}

export function createEquipment(body: CreateEquipment) {
  return unwrap(api.POST('/v1/equipment', { body }))
}

export function updateEquipment(id: string, body: UpdateEquipment) {
  return unwrap(api.PATCH('/v1/equipment/{id}', { params: { path: { id } }, body }))
}

export function deleteEquipment(id: string) {
  return unwrap(api.DELETE('/v1/equipment/{id}', { params: { path: { id } } }))
}

export function changeEquipmentStatus(
  id: string,
  body: components['schemas']['EquipmentStatusDto'],
) {
  return unwrap(api.POST('/v1/equipment/{id}/status', { params: { path: { id } }, body }))
}

export function cloneEquipment(id: string, body: components['schemas']['CloneEquipmentDto']) {
  return unwrap(api.POST('/v1/equipment/{id}/clone', { params: { path: { id } }, body }))
}

export function rotateQr(id: string) {
  return unwrap(api.POST('/v1/equipment/{id}/qr/rotate', { params: { path: { id } } }))
}

export function exportEquipment(params: EquipmentListParams) {
  return downloadFile('/v1/equipment', { ...params, export: 'xlsx' }, 'thiet-bi.xlsx')
}

export function downloadQrLabels(ids: string[]) {
  return downloadFile('/v1/equipment/qr/labels.pdf', { ids: ids.join(',') }, 'tem-qr.pdf')
}

export function downloadQrPng(id: string) {
  return downloadFile(`/v1/equipment/${id}/qr.png`, {}, `qr-${id}.png`)
}

export function putNetwork(id: string, body: components['schemas']['NetworkDto']) {
  return unwrap(api.PUT('/v1/equipment/{id}/network', { params: { path: { id } }, body }))
}

export function listAccessories(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/accessories', { params: { path: { id } } }))
}
export function createAccessory(id: string, body: components['schemas']['AccessoryDto']) {
  return unwrap(api.POST('/v1/equipment/{id}/accessories', { params: { path: { id } }, body }))
}
export function updateAccessory(
  id: string,
  aid: string,
  body: components['schemas']['UpdateAccessoryDto'],
) {
  return unwrap(
    api.PATCH('/v1/equipment/{id}/accessories/{aid}', { params: { path: { id, aid } }, body }),
  )
}
export function deleteAccessory(id: string, aid: string) {
  return unwrap(
    api.DELETE('/v1/equipment/{id}/accessories/{aid}', { params: { path: { id, aid } } }),
  )
}

export function listSoftware(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/software', { params: { path: { id } } }))
}
export function createSoftware(id: string, body: components['schemas']['SoftwareDto']) {
  return unwrap(api.POST('/v1/equipment/{id}/software', { params: { path: { id } }, body }))
}
export function updateSoftware(
  id: string,
  sid: string,
  body: components['schemas']['UpdateSoftwareDto'],
) {
  return unwrap(
    api.PATCH('/v1/equipment/{id}/software/{sid}', { params: { path: { id, sid } }, body }),
  )
}
export function deleteSoftware(id: string, sid: string) {
  return unwrap(api.DELETE('/v1/equipment/{id}/software/{sid}', { params: { path: { id, sid } } }))
}
export function softwareLicense(id: string, sid: string) {
  return unwrap(
    api.GET('/v1/equipment/{id}/software/{sid}/license-key', { params: { path: { id, sid } } }),
  )
}
export function upgradeSoftware(
  id: string,
  sid: string,
  body: components['schemas']['SoftwareUpgradeDto'],
) {
  return unwrap(
    api.POST('/v1/equipment/{id}/software/{sid}/upgrade', { params: { path: { id, sid } }, body }),
  )
}
export function softwareHistory(id: string, sid: string) {
  return unwrap(
    api.GET('/v1/equipment/{id}/software/{sid}/history', { params: { path: { id, sid } } }),
  )
}

export function listComponents(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/components', { params: { path: { id } } }))
}
export function createComponent(id: string, body: components['schemas']['ComponentDto']) {
  return unwrap(api.POST('/v1/equipment/{id}/components', { params: { path: { id } }, body }))
}
export function updateComponent(
  id: string,
  cid: string,
  body: components['schemas']['UpdateComponentDto'],
) {
  return unwrap(
    api.PATCH('/v1/equipment/{id}/components/{cid}', { params: { path: { id, cid } }, body }),
  )
}
export function deleteComponent(id: string, cid: string) {
  return unwrap(
    api.DELETE('/v1/equipment/{id}/components/{cid}', { params: { path: { id, cid } } }),
  )
}
export function replaceComponent(
  id: string,
  cid: string,
  body: components['schemas']['ReplaceComponentDto'],
) {
  return unwrap(
    api.POST('/v1/equipment/{id}/components/{cid}/replace', {
      params: { path: { id, cid } },
      body,
    }),
  )
}
export function componentReplacements(id: string, cid: string) {
  return unwrap(
    api.GET('/v1/equipment/{id}/components/{cid}/replacements', { params: { path: { id, cid } } }),
  )
}

// TODO(api): OpenAPI gộp SupplyResponseDto của kho; response thật là liên kết vật tư-máy.
export function listEquipmentSupplies(id: string) {
  return unwrapAs<EquipmentSupplyLink[]>(
    api.GET('/v1/equipment/{id}/supplies', { params: { path: { id } } }),
  )
}
export function putEquipmentSupplies(
  id: string,
  body: components['schemas']['EquipmentSupplyDto'][],
) {
  return unwrapAs<EquipmentSupplyLink[]>(
    api.PUT('/v1/equipment/{id}/supplies', { params: { path: { id } }, body }),
  )
}
export function equipmentRunway(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/supplies/runway', { params: { path: { id } } }))
}

export function listCounters(id: string, page = 1, limit = 50) {
  return unwrap(
    api.GET('/v1/equipment/{id}/counters', {
      params: { path: { id }, query: pageQuery({ page, limit }) },
    }),
  )
}
export function recordCounter(id: string, body: components['schemas']['CounterDto']) {
  return unwrap(api.POST('/v1/equipment/{id}/counters', { params: { path: { id } }, body }))
}

export function listEvents(
  id: string,
  params: { page?: number; limit?: number; type?: string; from?: string; to?: string },
) {
  return unwrap(
    api.GET('/v1/equipment/{id}/events', {
      params: { path: { id }, query: pageQuery(params) },
    }),
  )
}
export function addNote(id: string, text: string) {
  return unwrap(api.POST('/v1/equipment/{id}/notes', { params: { path: { id } }, body: { text } }))
}
export function statusHistory(id: string, page = 1, limit = 50) {
  return unwrap(
    api.GET('/v1/equipment/{id}/status-history', {
      params: { path: { id }, query: pageQuery({ page, limit }) },
    }),
  )
}

export function listTransfers(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/transfers', { params: { path: { id } } }))
}
// TODO(api): swagger trùng tên `TransferDto` (điều chuyển máy vs chuyển kho) nên schema
// sinh ra là DTO của kho; giữ shape thật của điều chuyển máy ở đây.
export interface EquipmentTransferBody {
  toDepartmentId: string
  /** Phòng đích — phải thuộc khoa đích hoặc dùng chung; duyệt → máy gán phòng. */
  toRoomId?: string | null
  toLocation?: string | null
  reason: string
}
export function createTransfer(id: string, body: EquipmentTransferBody) {
  return unwrap(
    api.POST('/v1/equipment/{id}/transfers', {
      params: { path: { id } },
      body: apiBody<components['schemas']['TransferDto']>(body),
    }),
  )
}
export function approveTransfer(id: string, tid: string, note?: string) {
  return unwrap(
    api.POST('/v1/equipment/{id}/transfers/{tid}/approve', {
      params: { path: { id, tid } },
      body: { note },
    }),
  )
}
export function rejectTransfer(id: string, tid: string, reason: string) {
  return unwrap(
    api.POST('/v1/equipment/{id}/transfers/{tid}/reject', {
      params: { path: { id, tid } },
      body: { reason },
    }),
  )
}
export function cancelTransfer(id: string, tid: string) {
  return unwrap(
    api.POST('/v1/equipment/{id}/transfers/{tid}/cancel', { params: { path: { id, tid } } }),
  )
}

export function listAllTransfers(params: {
  page?: number
  limit?: number
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
}) {
  return unwrap(api.GET('/v1/equipment/transfers', { params: { query: pageQuery(params) } }))
}

export function compareEquipment(ids: string) {
  return unwrap(api.GET('/v1/equipment/compare', { params: { query: { ids } } }))
}

export function equipmentByQr(token: string) {
  return unwrap(api.GET('/v1/equipment/by-qr/{token}', { params: { path: { token } } }))
}

export async function catalogOptions(
  slug:
    | 'manufacturers'
    | 'suppliers'
    | 'equipment-groups'
    | 'funding-sources'
    | 'connection-types'
    | 'component-types',
  q: string,
  limit = 50,
): Promise<ReferenceOption[]> {
  const query = { params: { query: pageQuery({ q, all: true, page: 1, limit }) } }
  const result =
    slug === 'manufacturers'
      ? await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
          api.GET('/v1/catalogs/manufacturers', query),
        )
      : slug === 'suppliers'
        ? await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
            api.GET('/v1/catalogs/suppliers', query),
          )
        : slug === 'equipment-groups'
          ? await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
              api.GET('/v1/catalogs/equipment-groups', query),
            )
          : slug === 'funding-sources'
            ? await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
                api.GET('/v1/catalogs/funding-sources', query),
              )
            : slug === 'connection-types'
              ? await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
                  api.GET('/v1/catalogs/connection-types', query),
                )
              : await unwrapAs<ReferenceOption[] | { items: ReferenceOption[] }>(
                  api.GET('/v1/catalogs/component-types', query),
                )
  return Array.isArray(result) ? result : result.items
}

export async function userOptions(q: string, limit = 50): Promise<ReferenceOption[]> {
  const result = await unwrapAs<{
    items: { id: string; username: string; fullName: string }[]
  }>(api.GET('/v1/users', { params: { query: pageQuery({ q, page: 1, limit }) } }))
  return result.items.map((user) => ({
    id: user.id,
    code: user.username,
    name: user.fullName,
  }))
}

export async function supplyOptions(q: string, limit = 50): Promise<ReferenceOption[]> {
  const result = await unwrapAs<
    | { id: string; code: string; name: string }[]
    | { items: { id: string; code: string; name: string }[] }
  >(api.GET('/v1/supplies', { params: { query: pageQuery({ q, page: 1, limit }) } }))
  return Array.isArray(result) ? result : result.items
}

// TODO(api): OpenAPI khai `GET /v1/supplies/{id}` là SupplyResponseDto (liên kết máy–vật tư)
// nhưng thực tế trả hồ sơ vật tư; khai type tay tới khi backend sửa swagger.
export async function resolveSupplyOption(id: string): Promise<ReferenceOption | null> {
  try {
    const row = await unwrapAs<{ id: string; code: string; name: string }>(
      api.GET('/v1/supplies/{id}', { params: { path: { id } } }),
    )
    return { id: row.id, code: row.code, name: row.name }
  } catch {
    return null
  }
}

/** Nhãn `code — name` của một máy, dùng cho AsyncSelect có giá trị ban đầu. */
export async function resolveEquipmentOption(id: string): Promise<ReferenceOption | null> {
  try {
    const row = await getEquipment(id)
    return { id: row.id, code: row.code, name: row.name }
  } catch {
    return null
  }
}

export function listRepairsForEquipment(equipmentId: string) {
  return unwrap(
    api.GET('/v1/repairs', { params: { query: pageQuery({ equipmentId, page: 1, limit: 50 }) } }),
  )
}

export function listMaintenanceForEquipment(equipmentId: string) {
  return unwrap(
    api.GET('/v1/maintenance/tasks', {
      params: { query: pageQuery({ equipmentId, page: 1, limit: 50 }) },
    }),
  )
}

export function listCalibrationHistory(equipmentId: string) {
  return unwrap(
    api.GET('/v1/calibrations/equipment/{equipmentId}/history', {
      params: { path: { equipmentId } },
    }),
  )
}

export function emptyToNull<T extends Record<string, unknown>>(body: T): T {
  const out = { ...body }
  for (const key of Object.keys(out) as (keyof T)[])
    if (out[key] === '') (out[key] as unknown) = null
  return out
}

export function diffUpdate(before: UpdateEquipment, after: UpdateEquipment): UpdateEquipment {
  const body: UpdateEquipment = {}
  for (const key of Object.keys(after) as (keyof UpdateEquipment)[]) {
    if (JSON.stringify(after[key]) !== JSON.stringify(before[key]))
      (body as Record<string, unknown>)[key] = after[key]
  }
  return body
}

export function usedPct(
  row: {
    lifespanHours: number | null
    lifespanTests: number | null
    lifespanMonths: number | null
    usageHoursAtInstall: string
    usageTestsAtInstall: number
    installedAt: string | null
  },
  equipment: Pick<EquipmentDetail, 'currentRunHours' | 'currentTestCount'>,
) {
  const parts: number[] = []
  if (row.lifespanHours && row.lifespanHours > 0) {
    const used = Number(equipment.currentRunHours) - Number(row.usageHoursAtInstall)
    parts.push(Math.max(0, used / row.lifespanHours))
  }
  if (row.lifespanTests && row.lifespanTests > 0)
    parts.push(
      Math.max(0, (equipment.currentTestCount - row.usageTestsAtInstall) / row.lifespanTests),
    )
  if (row.installedAt && row.lifespanMonths && row.lifespanMonths > 0) {
    const start = new Date(row.installedAt).getTime()
    const lifeMs = row.lifespanMonths * 30.44 * 24 * 3600 * 1000
    parts.push(Math.max(0, (Date.now() - start) / lifeMs))
  }
  return parts.length ? Math.max(...parts) : 0
}
