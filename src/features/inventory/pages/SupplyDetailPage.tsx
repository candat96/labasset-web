import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { api, unwrapAs } from '@/api/client'
import { getSupply } from '../api'

export function Component() {
  const { id = '' } = useParams()
  const canWrite = useCan(STAFF)
  const detail = useQuery({
    queryKey: ['supplies', id],
    queryFn: () => getSupply(id),
    enabled: !!id,
  })
  const stock = useQuery({
    queryKey: ['supplies', id, 'stock'],
    queryFn: () =>
      unwrapAs<{ lots?: { id: string; lotNo?: string; qtyOnHand?: string }[] }>(
        api.GET('/v1/supplies/{id}/stock', { params: { path: { id } } }),
      ),
    enabled: !!id,
  })
  if (detail.isPending) return <p role="status">Đang tải vật tư…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  return (
    <>
      <PageHeader
        title={row.name}
        description={row.code}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        actions={
          canWrite && (
            <Button asChild>
              <Link to={`/supplies/${id}/edit`}>Sửa</Link>
            </Button>
          )
        }
      />
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Giá tham khảo</dt>
          <dd>{formatVnd(row.refPrice) || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Theo lô / hạn</dt>
          <dd>
            {row.trackLot ? 'Lô' : 'Không'} / {row.trackExpiry ? 'Hạn' : 'Không'}
          </dd>
        </div>
      </dl>
      <h2 className="mt-6 mb-2 font-medium">Tồn theo lô</h2>
      <ul className="text-sm">
        {(stock.data?.lots ?? []).map((lot) => (
          <li key={lot.id}>
            {lot.lotNo ?? lot.id} · {lot.qtyOnHand}
          </li>
        ))}
        {(stock.data?.lots ?? []).length === 0 && (
          <li className="text-muted-foreground">Chưa có lô</li>
        )}
      </ul>
    </>
  )
}
