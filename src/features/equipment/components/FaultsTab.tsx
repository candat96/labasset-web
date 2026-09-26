import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { unwrapAs, untypedApi } from '@/api/client'
import { messageFor } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { StatusBadge } from '@/components/status-badge'
import { faultSeverityMap } from '@/lib/status-maps'

/**
 * Tab "Lỗi thường gặp": lỗi từ thư viện khớp máy đang xem (model/nhóm/hãng)
 * qua `GET /v1/faults/suggest`, kèm số lần đã gặp trên máy và trên cùng model.
 */
export function FaultsTab({
  id,
  canWrite,
  model,
  manufacturerId,
  groupId,
}: {
  id: string
  canWrite: boolean
  model?: string | null
  manufacturerId?: string | null
  groupId?: string | null
}) {
  const { t } = useTranslation('equipment')
  // Thêm lỗi ngay trong hồ sơ máy: điền sẵn model/nhóm/hãng của máy.
  const addParams = new URLSearchParams({ equipmentId: id })
  if (model) {
    addParams.set('scope', 'model')
    addParams.set('model', model)
  } else if (groupId) {
    addParams.set('scope', 'group')
  }
  if (manufacturerId) addParams.set('manufacturerId', manufacturerId)
  if (groupId) addParams.set('groupId', groupId)
  const suggestions = useQuery({
    queryKey: ['equipment', id, 'faults'],
    queryFn: async () =>
      unwrapAs<
        {
          fault: {
            id: string
            errorCode?: string | null
            title: string
            severity: string
            symptoms?: string | null
          }
          occurrences?: { onEquipment?: number; sameModel?: number }
        }[]
      >(untypedApi.GET('/v1/faults/suggest', { params: { query: { equipmentId: id } } })),
  })

  const rows = suggestions.data ?? []
  return (
    <SectionCard
      title={t('tabs.faults', { defaultValue: 'Lỗi thường gặp' })}
      actions={
        <>
          <Link className="text-primary text-sm font-medium hover:text-primary/80" to="/faults">
            {t('faultsTab.library', { defaultValue: 'Thư viện lỗi' })}
          </Link>
          {canWrite && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/faults/new?${addParams.toString()}`}>
                {t('faultsTab.add', { defaultValue: 'Thêm lỗi' })}
              </Link>
            </Button>
          )}
        </>
      }
    >
      {suggestions.isPending ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : suggestions.error ? (
        <ErrorState error={suggestions.error} onRetry={() => void suggestions.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('faultsTab.empty', {
            defaultValue: 'Chưa có lỗi nào trong thư viện cho máy này',
          })}
        />
      ) : (
        <ul className="divide-y">
          {rows.map((item) => {
            const f = item.fault
            const onEquipment = item.occurrences?.onEquipment ?? 0
            const sameModel = item.occurrences?.sameModel ?? 0
            return (
              <li key={f.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    className="text-primary font-medium hover:text-primary/80"
                    to={`/faults/${f.id}`}
                  >
                    {f.errorCode ? (
                      <span className="text-primary mr-2 font-mono text-xs">{f.errorCode}</span>
                    ) : null}
                    <span className="font-medium">{f.title}</span>
                  </Link>
                  {f.symptoms ? (
                    <p className="text-muted-foreground mt-0.5 text-[12.5px]">{f.symptoms}</p>
                  ) : null}
                  <p className="text-subtle mt-0.5 text-[12px]">
                    {t('faultsTab.times', {
                      defaultValue: 'Đã gặp {{on}} lần trên máy này · {{model}} máy cùng model',
                      on: onEquipment,
                      model: sameModel,
                    })}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0">
                  <StatusBadge value={f.severity} map={faultSeverityMap} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {suggestions.error ? (
        <p className="text-subtle text-xs">{messageFor(suggestions.error)}</p>
      ) : null}
    </SectionCard>
  )
}
