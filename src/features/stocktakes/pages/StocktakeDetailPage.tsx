import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AuditTrail } from '@/components/audit-trail'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirm } from '@/components/confirm-dialog'
import { stocktakeStatusMap } from '@/lib/status-maps'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import * as api from '../api'

export function Component() {
  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['stocktakes', id],
    queryFn: () => api.getStocktake(id),
    enabled: !!id,
  })
  const progress = useQuery({
    queryKey: ['stocktakes', id, 'progress'],
    queryFn: () => api.stocktakeProgress(id),
    enabled: !!id,
    refetchInterval: detail.data?.status === 'counting' ? 30000 : false,
  })
  const items = useQuery({
    queryKey: ['stocktakes', id, 'items'],
    queryFn: () => api.stocktakeItems(id, { page: 1, limit: 50 }),
    enabled: !!id,
  })
  const extras = useQuery({
    queryKey: ['stocktakes', id, 'extras'],
    queryFn: () => api.stocktakeExtras(id),
    enabled: !!id,
  })
  const isStaff = useCan(STAFF)
  const isAdm = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">Đang tải đợt kiểm kê…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success('Đã cập nhật đợt')
      void detail.refetch()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <PageHeader
        title={row.name}
        description={row.code}
        badge={<StatusBadge value={row.status} map={stocktakeStatusMap} />}
        actions={
          <div className="flex flex-wrap gap-2">
            {isStaff && row.status === 'draft' && (
              <Button onClick={() => void run('Chụp sổ?', () => api.openStocktake(id))}>
                Chụp sổ
              </Button>
            )}
            {isStaff && row.status === 'open' && (
              <Button onClick={() => void run('Bắt đầu đếm?', () => api.startCounting(id))}>
                Bắt đầu đếm
              </Button>
            )}
            {isStaff && row.status === 'counting' && (
              <Button onClick={() => void run('Chuyển rà soát?', () => api.reviewStocktake(id))}>
                Chuyển rà soát
              </Button>
            )}
            {isAdm && row.status === 'review' && (
              <Button onClick={() => void run('Chốt đợt?', () => api.closeStocktake(id))}>
                Chốt
              </Button>
            )}
            {isStaff && row.status !== 'closed' && row.status !== 'cancelled' && (
              <Button
                variant="outline"
                onClick={() => void run('Huỷ đợt?', () => api.cancelStocktake(id))}
              >
                Huỷ
              </Button>
            )}
          </div>
        }
      />
      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Tiến độ</TabsTrigger>
          <TabsTrigger value="items">Danh sách kiểm</TabsTrigger>
          <TabsTrigger value="extras">Ngoài sổ</TabsTrigger>
          <TabsTrigger value="audit">Lịch sử</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          <p className="text-sm">
            Đã đếm {progress.data?.counted ?? 0}/{progress.data?.total ?? 0} (
            {progress.data?.percent ?? 0}%)
          </p>
        </TabsContent>
        <TabsContent value="items">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Mã</th>
                <th>Sổ</th>
                <th>Đếm</th>
              </tr>
            </thead>
            <tbody>
              {(
                (
                  items.data as
                    | {
                        items?: {
                          id: string
                          code?: string
                          bookQty?: string
                          countedQty?: string | null
                        }[]
                      }
                    | undefined
                )?.items ?? []
              ).map((item) => (
                <tr key={item.id} className="border-t">
                  <td>{item.code ?? item.id}</td>
                  <td>{formatQty(item.bookQty)}</td>
                  <td>{item.countedQty == null ? 'chưa đếm' : formatQty(item.countedQty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
        <TabsContent value="extras">
          <ul className="text-sm">
            {(
              (Array.isArray(extras.data)
                ? extras.data
                : ((
                    extras.data as
                      { items?: { id: string; lotNo?: string; qrToken?: string }[] } | undefined
                  )?.items ?? [])) as { id: string; lotNo?: string; qrToken?: string }[]
            ).map((item) => (
              <li key={item.id}>{item.lotNo ?? item.qrToken ?? item.id}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="audit">
          <AuditTrail entityType="stocktake_session" entityId={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
