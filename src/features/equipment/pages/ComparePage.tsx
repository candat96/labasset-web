import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AsyncSelect } from '@/components/form/async-select'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { compareEquipment, listEquipment, resolveEquipmentOption } from '../api'
import { equipmentKeys } from '../hooks'
import type { EquipmentDetail } from '../types'
import { cn } from '@/lib/utils'

/** Các trường backend đưa vào `diff` (xem `generalFields` + specs/network/counts của API). */
const GENERAL_FIELDS = [
  'code',
  'name',
  'assetCode',
  'model',
  'serial',
  'countryOfOrigin',
  'purchaseContractNo',
  'decisionNo',
  'location',
  'manufactureYear',
  'receivedAt',
  'commissionedAt',
  'warrantyUntil',
  'originalValue',
  'manufacturerId',
  'supplierId',
  'fundingSourceId',
  'groupId',
  'departmentId',
  'deptContactUserId',
  'staffInChargeUserId',
  'status',
  'statusNote',
  'testTypes',
  'throughputPerHour',
  'notes',
] as const

const BASE_FIELDS = [
  ...GENERAL_FIELDS,
  'specs.voltage',
  'specs.power',
  'specs.dimensions',
  'specs.weight',
  'specs.env.temp',
  'specs.env.humidity',
  'specs.env.ups',
  'specs.env.water',
  'specs.env.gas',
  'network.ip',
  'network.mac',
  'network.lisNote',
  'network.hostPcName',
  'network.hostPcSpec',
  'network.port',
  'network.protocol',
  'network.lisConnected',
  'network.diagramFileId',
  'counts.accessories',
  'counts.components',
  'counts.software',
] as const

function valueAt(row: unknown, path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      row,
    )
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function Component() {
  const { t } = useTranslation('equipment')
  const [sp, setSp] = useSearchParams()
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean)
  const a = ids[0] ?? ''
  const b = ids[1] ?? ''
  const compare = useQuery({
    queryKey: equipmentKeys.compare(a, b),
    queryFn: () => compareEquipment(`${a},${b}`),
    enabled: ids.length === 2,
  })
  const setId = (index: 0 | 1, id: string | null) => {
    const next = [...ids]
    next[index] = id ?? ''
    setSp({ ids: next.filter(Boolean).join(',') })
  }
  const load = async (q: string) => {
    const page = await listEquipment({ q, page: 1, limit: 20 })
    return page.items.map((row) => ({ id: row.id, code: row.code, name: row.name }))
  }
  const compareOptions = (compare.data?.items ?? []).map((item: EquipmentDetail) => ({
    id: item.id,
    code: item.code,
    name: item.name,
  }))
  const diff = compare.data?.diff ?? []
  const extraFields = diff.filter((path) => !(BASE_FIELDS as readonly string[]).includes(path))
  const fields = [...BASE_FIELDS, ...extraFields]
  return (
    <>
      <PageHeader
        title={t('compare.title')}
        description={t('compare.hint', {
          defaultValue: 'Chọn hai máy để so sánh thông số cạnh nhau.',
        })}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <AsyncSelect
          label={t('compare.machine', { index: 1 })}
          queryKey="eq-a"
          loadOptions={load}
          value={a || null}
          onChange={(value) => setId(0, typeof value === 'string' ? value : null)}
          selectedOptions={compareOptions}
          resolveOption={resolveEquipmentOption}
          clearable
        />
        <AsyncSelect
          label={t('compare.machine', { index: 2 })}
          queryKey="eq-b"
          loadOptions={load}
          value={b || null}
          onChange={(value) => setId(1, typeof value === 'string' ? value : null)}
          selectedOptions={compareOptions}
          resolveOption={resolveEquipmentOption}
          clearable
        />
      </div>
      {ids.length !== 2 && <p className="text-muted-foreground">{t('actions.selectTwo')}</p>}
      {compare.isPending && ids.length === 2 && <p role="status">{t('compare.loading')}</p>}
      {compare.error && <ErrorState error={compare.error} onRetry={() => void compare.refetch()} />}
      {compare.data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {compare.data.items.map((item) => (
            <section key={item.id} className="rounded border p-3 text-sm">
              <h2 className="font-medium">
                {item.code} · {item.name}
              </h2>
              {fields.map((path) => (
                <p key={path} className={cn(diff.includes(path) && 'bg-warning/15 rounded px-1')}>
                  {path}: {valueAt(item, path)}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
