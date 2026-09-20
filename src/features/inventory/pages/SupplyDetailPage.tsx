import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap, lotStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { formatDate } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { api, unwrap, unwrapAs } from '@/api/client'
import { messageFor } from '@/api/errors'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupply, getSupplyStock, openLot } from '../api'
import { useTranslation } from 'react-i18next'

interface CardRow {
  id?: string
  at?: string
  createdAt?: string
  type?: string
  documentCode?: string
  quantityIn?: string
  quantityOut?: string
  balanceAfter?: string
  unitCost?: string
}

export function Component() {
  const { t } = useTranslation('inventory')
  const { id = '' } = useParams()
  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['supplies', id],
    queryFn: () => getSupply(id),
    enabled: !!id,
  })
  const stock = useQuery({
    queryKey: ['supplies', id, 'stock'],
    queryFn: () => getSupplyStock(id),
    enabled: !!id,
  })
  const card = useQuery({
    queryKey: ['supplies', id, 'card'],
    queryFn: () =>
      unwrapAs<{ opening?: string; closing?: string; items?: CardRow[] }>(
        api.GET('/v1/supplies/{id}/card', { params: { path: { id }, query: {} } }),
      ),
    enabled: !!id,
  })
  const equipment = useQuery({
    queryKey: ['supplies', id, 'equipment'],
    queryFn: () => unwrap(api.GET('/v1/supplies/{id}/equipment', { params: { path: { id } } })),
    enabled: !!id,
  })
  const forecast = useQuery({
    queryKey: ['stock', 'forecast', id],
    queryFn: () => unwrap(api.GET('/v1/stock/forecast', { params: { query: { supplyId: id } } })),
    enabled: !!id,
  })
  if (detail.isPending) return <p role="status">{t('loadingSupply')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const lots = stock.data?.lots ?? []
  const compatible = equipment.data ?? []
  return (
    <>
      <PageHeader
        title={row.name}
        description={row.code}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        actions={
          canWrite && (
            <Button asChild>
              <Link to={`/supplies/${id}/edit`}>{t('edit')}</Link>
            </Button>
          )
        }
      />
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t('refPrice')}</dt>
          <dd>{formatVnd(row.refPrice) || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('trackLotExpiry')}</dt>
          <dd>
            {row.trackLot ? t('lot') : t('no')} / {row.trackExpiry ? t('expiry') : t('no')}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('storageCondition')}</dt>
          <dd>{row.storageCondition || '—'}</dd>
        </div>
      </dl>
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t('stockByLot')}</TabsTrigger>
          <TabsTrigger value="card">{t('stockCard')}</TabsTrigger>
          <TabsTrigger value="equipment">{t('compatibleEquipment')}</TabsTrigger>
          <TabsTrigger value="forecast">{t('forecast')}</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          {stock.error ? (
            <ErrorState error={stock.error} onRetry={() => void stock.refetch()} />
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t('warehouse')}</th>
                    <th>{t('lot')}</th>
                    <th>{t('onHand')}</th>
                    <th>{t('reserved')}</th>
                    <th>{t('available')}</th>
                    <th>{t('status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.warehouseId ?? '—'}</td>
                      <td>{lot.lotNo ?? '—'}</td>
                      <td>{lot.qtyOnHand ?? '0'}</td>
                      <td>{lot.qtyReserved ?? '0'}</td>
                      <td>{lot.available ?? '0'}</td>
                      <td>
                        <StatusBadge value={lot.status ?? 'available'} map={lotStatusMap} />
                      </td>
                      <td>
                        {canWrite && row.openVialDays && lot.status === 'available' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await openLot(lot.id)
                                toast.success(t('lotOpened'))
                                void qc.invalidateQueries({ queryKey: ['supplies', id, 'stock'] })
                              } catch (error) {
                                toast.error(messageFor(error))
                              }
                            }}
                          >
                            {t('openLot')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!lots.length && <p className="p-4 text-sm text-muted-foreground">{t('noLots')}</p>}
            </div>
          )}
        </TabsContent>
        <TabsContent value="card">
          {card.error ? (
            <ErrorState error={card.error} onRetry={() => void card.refetch()} />
          ) : (
            <>
              <p className="mb-2 text-sm">
                {t('openingBalance')}: {card.data?.opening ?? '0'} · {t('closingBalance')}:{' '}
                {card.data?.closing ?? '0'}
              </p>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>{t('date')}</th>
                      <th>{t('document')}</th>
                      <th>{t('in')}</th>
                      <th>{t('out')}</th>
                      <th>{t('balance')}</th>
                      <th>{t('unitCost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(card.data?.items ?? []).map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td>{formatDate(item.at ?? item.createdAt)}</td>
                        <td>{item.documentCode ?? item.type ?? '—'}</td>
                        <td>{item.quantityIn ?? '—'}</td>
                        <td>{item.quantityOut ?? '—'}</td>
                        <td>{item.balanceAfter ?? '—'}</td>
                        <td>{formatVnd(item.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="equipment">
          <ul className="space-y-2 text-sm">
            {compatible.map((item) => (
              <li key={item.id}>
                <Link className="text-primary hover:underline" to={`/equipment/${item.id}`}>
                  {item.code} — {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="forecast">
          {forecast.error ? (
            <ErrorState error={forecast.error} onRetry={() => void forecast.refetch()} />
          ) : (
            <dl className="grid gap-3 sm:grid-cols-4">
              <div>
                <dt>{t('avg30')}</dt>
                <dd>{forecast.data?.avg30}</dd>
              </div>
              <div>
                <dt>{t('avg90')}</dt>
                <dd>{forecast.data?.avg90}</dd>
              </div>
              <div>
                <dt>{t('dailyUsage')}</dt>
                <dd>{forecast.data?.dailyUsage}</dd>
              </div>
              <div>
                <dt>{t('daysLeft')}</dt>
                <dd>{forecast.data?.daysLeft ?? '—'}</dd>
              </div>
            </dl>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
