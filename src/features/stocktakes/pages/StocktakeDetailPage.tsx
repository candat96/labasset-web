import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { StocktakeCountsResult, StocktakePackageItem } from '../api'
import { addBatch, clearBatch, loadBatch } from '../batch'
import type { StocktakeCountLine } from '../batch'

type ExtraRow = {
  id: string
  lotNo?: string | null
  qrToken?: string | null
  supplyCode?: string | null
  countedQty?: string | null
  status?: string
}

function extraRows(data: unknown): ExtraRow[] {
  if (Array.isArray(data)) return data as ExtraRow[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: ExtraRow[] }).items)) {
    return (data as { items: ExtraRow[] }).items
  }
  return []
}

function findPackageItem(items: StocktakePackageItem[], scan: string) {
  const q = scan.trim().toLowerCase()
  if (!q) return undefined
  return items.find((item) =>
    [item.code, item.qrToken, item.lotNo, item.id].some((value) => value?.toLowerCase() === q),
  )
}

function CountPanel({
  sessionId,
  items,
  onSent,
}: {
  sessionId: string
  items: StocktakePackageItem[]
  onSent: () => void
}) {
  const [scan, setScan] = useState('')
  const [qty, setQty] = useState('1')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [batch, setBatch] = useState<StocktakeCountLine[]>(() => loadBatch(sessionId))
  const [result, setResult] = useState<StocktakeCountsResult | null>(null)
  const [sending, setSending] = useState(false)
  useEffect(() => {
    setBatch(loadBatch(sessionId))
  }, [sessionId])
  const match = useMemo(() => findPackageItem(items, scan), [items, scan])
  const ghi = () => {
    const code = scan.trim()
    if (!code) {
      toast.error('Nhập mã hoặc QR')
      return
    }
    const found = findPackageItem(items, code)
    addBatch(sessionId, {
      code,
      countedQty: qty.trim() || '1',
      countedStatus: status.trim() || undefined,
      countedLocation: location.trim() || undefined,
      extra: !found,
    })
    setBatch(loadBatch(sessionId))
    setScan('')
    setQty('1')
    setStatus('')
    setLocation('')
  }
  const gui = async () => {
    const lines = loadBatch(sessionId)
    if (!lines.length) return
    setSending(true)
    try {
      const posted = await api.postCounts(
        sessionId,
        lines.map((line) => {
          const found = findPackageItem(items, line.code)
          const body: Record<string, unknown> = {
            clientId: line.clientId,
            countedQty: line.countedQty,
            countedAt: line.countedAt,
          }
          if (line.countedStatus) body.countedStatus = line.countedStatus
          if (line.countedLocation) body.countedLocation = line.countedLocation
          if (found?.id) body.itemId = found.id
          else body.qrToken = line.code
          return body
        }),
      )
      setResult(posted)
      clearBatch(sessionId)
      setBatch([])
      toast.success('Đã gửi số đếm')
      onSent()
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="space-y-3 text-sm">
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          ghi()
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="stocktake-scan">Quét / nhập mã</Label>
          <Input
            id="stocktake-scan"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-qty">Số đếm</Label>
          <Input
            id="stocktake-qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-status">Trạng thái đếm</Label>
          <Input
            id="stocktake-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-location">Vị trí đếm</Label>
          <Input
            id="stocktake-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">Ghi</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!batch.length || sending}
            onClick={() => void gui()}
          >
            Gửi ({batch.length})
          </Button>
        </div>
      </form>
      {scan.trim() ? (
        match ? (
          <p>
            {match.code} · {match.name} · Sổ {formatQty(match.bookQty)}
            {match.location ? ` · ${match.location}` : ''}
          </p>
        ) : (
          <p className="text-muted-foreground">Không có trong sổ — sẽ ghi ngoài sổ</p>
        )
      ) : null}
      {batch.length > 0 && (
        <ul>
          {batch.map((line) => (
            <li key={line.clientId}>
              {line.code} · {formatQty(line.countedQty)}
              {line.extra ? ' · ngoài sổ' : ''}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <div className="space-y-2">
          <p>
            Đã nhận {result.accepted} · Trùng {result.duplicated} · Xung đột{' '}
            {result.conflicts.length} · Ngoài sổ {result.extras.length}
          </p>
          {result.conflicts.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>clientId</th>
                  <th>Đã có người đếm mới hơn</th>
                </tr>
              </thead>
              <tbody>
                {result.conflicts.map((row) => (
                  <tr key={row.clientId} className="border-t">
                    <td>{row.clientId}</td>
                    <td>{row.keptCountedAt ?? row.itemId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

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
  const pkg = useQuery({
    queryKey: ['stocktakes', id, 'package'],
    queryFn: () => api.stocktakePackage(id),
    enabled: !!id && detail.data?.status === 'counting',
    staleTime: Infinity,
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
  const resolve = async (extraId: string, body: { itemId?: string; ignore?: boolean }) => {
    try {
      await api.resolveExtra(id, extraId, body)
      toast.success('Đã xử lý dòng ngoài sổ')
      void extras.refetch()
      void items.refetch()
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
            {row.status === 'closed' && (
              <Button variant="outline" asChild>
                <Link to={`/stocktakes/${id}/compare`}>So sánh</Link>
              </Button>
            )}
          </div>
        }
      />
      <Tabs defaultValue="progress">
        <TabsList className="flex-wrap">
          <TabsTrigger value="progress">Tiến độ</TabsTrigger>
          <TabsTrigger value="items">Danh sách kiểm</TabsTrigger>
          {row.status === 'counting' && <TabsTrigger value="count">Đếm trên web</TabsTrigger>}
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
        {row.status === 'counting' && (
          <TabsContent value="count">
            <CountPanel
              sessionId={id}
              items={pkg.data?.items ?? []}
              onSent={() => {
                void progress.refetch()
                void items.refetch()
                void extras.refetch()
              }}
            />
          </TabsContent>
        )}
        <TabsContent value="extras">
          <ul className="space-y-2 text-sm">
            {extraRows(extras.data).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {item.lotNo ?? item.qrToken ?? item.supplyCode ?? item.id}
                  {item.countedQty ? ` · ${formatQty(item.countedQty)}` : ''}
                  {item.status ? ` · ${item.status}` : ''}
                </span>
                {item.status !== 'linked' && item.status !== 'ignored' && isStaff && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const itemId = window.prompt('Mã dòng kiểm (itemId)')?.trim()
                        if (!itemId) return
                        void resolve(item.id, { itemId })
                      }}
                    >
                      Gắn vào dòng
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void resolve(item.id, { ignore: true })}
                    >
                      Bỏ qua
                    </Button>
                  </>
                )}
              </li>
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
