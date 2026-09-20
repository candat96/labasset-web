import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { staffUserOptions, catalogOptions } from '@/api/references'
import { stocktakeStatusMap } from '@/lib/status-maps'
import { formatQty } from '@/lib/format/number'
import { decimalString } from '@/lib/validation/decimal'
import { useCan } from '@/app/guards/useCan'
import { useAuthStore } from '@/stores/auth.store'
import { ADM, STAFF } from '@/routes/roles'
import { isApiError, messageFor } from '@/api/errors'
import * as api from '../api'
import type { StocktakeCountsResult, StocktakePackageItem } from '../api'
import { addBatch, clearBatch, loadBatch } from '../batch'
import type { StocktakeCountLine } from '../batch'
import { useTranslation } from 'react-i18next'

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

const countQtySchema = decimalString({ maxScale: 3, min: '0' })

function findPackageItem(items: StocktakePackageItem[], scan: string) {
  const q = scan.trim().toLowerCase()
  if (!q) return undefined
  return items.find((item) =>
    [item.code, item.supplyCode, item.manufacturerCode, item.qrToken, item.lotNo, item.id].some(
      (value) => value?.toLowerCase() === q,
    ),
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
  const { t } = useTranslation('stocktakes')

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
      toast.error(t('scanRequired'))
      return
    }
    const parsedQty = countQtySchema.safeParse(qty.trim() || '1')
    if (!parsedQty.success) {
      toast.error(t('countQtyInvalid'))
      return
    }
    const found = findPackageItem(items, code)
    addBatch(sessionId, {
      code,
      itemId: found?.id,
      lotId: found?.lotId,
      countedQty: parsedQty.data,
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
          const body: Record<string, unknown> = {
            clientId: line.clientId,
            countedQty: line.countedQty,
            countedAt: line.countedAt,
          }
          if (line.countedStatus) body.countedStatus = line.countedStatus
          if (line.countedLocation) body.countedLocation = line.countedLocation
          if (line.itemId) body.itemId = line.itemId
          else body.qrToken = line.code
          if (line.lotId) body.lotId = line.lotId
          return body
        }),
      )
      setResult(posted)
      clearBatch(sessionId)
      setBatch([])
      toast.success(t('countsSent'))
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
          <Label htmlFor="stocktake-scan">{t('scanLabel')}</Label>
          <Input
            id="stocktake-scan"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-qty">{t('countedQty')}</Label>
          <Input
            id="stocktake-qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-status">{t('countedStatus')}</Label>
          <Input
            id="stocktake-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stocktake-location">{t('countedLocation')}</Label>
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
            {t('sendPrefix')}
            {batch.length})
          </Button>
        </div>
      </form>
      {scan.trim() ? (
        match ? (
          <p>
            {match.code} · {match.name} {t('bookSuffix')} {formatQty(match.bookQty)}
            {match.location ? ` · ${match.location}` : ''}
          </p>
        ) : (
          <p className="text-muted-foreground">{t('notInBook')}</p>
        )
      ) : null}
      {batch.length > 0 && (
        <ul>
          {batch.map((line) => (
            <li key={line.clientId}>
              {line.code} · {formatQty(line.countedQty)}
              {line.extra ? t('extraSuffix') : ''}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <div className="space-y-2">
          <p>
            {t('accepted')} {result.accepted} {t('duplicatedSuffix')} {result.duplicated}{' '}
            {t('conflictsSuffix')} {result.conflicts.length} {t('extrasSuffix')}{' '}
            {result.extras.length}
          </p>
          {result.conflicts.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>clientId</th>
                  <th>{t('newerCount')}</th>
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
  const { t } = useTranslation('stocktakes')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const invalidateSession = () => {
    void qc.invalidateQueries({ queryKey: ['stocktakes'] })
  }
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
  const userId = useAuthStore((state) => state.user?.id)
  const [tab, setTab] = useState('progress')
  const [assignOpen, setAssignOpen] = useState(false)
  const [extraToLink, setExtraToLink] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const assignForm = useForm({
    defaultValues: { userId: '', locations: '', warehouseIds: [] as string[] },
  })
  const extraForm = useForm({ defaultValues: { itemId: '' } })
  const compareForm = useForm({ defaultValues: { withSessionId: '' } })
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">{t('loading')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const assignments = row.assignments as Array<{ userId?: string }>
  const canCount = isAdm || assignments.some((assignment) => assignment.userId === userId)
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success(t('updated'))
      invalidateSession()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const resolve = async (extraId: string, body: { itemId?: string; ignore?: boolean }) => {
    try {
      await api.resolveExtra(id, extraId, body)
      toast.success(t('extraResolved'))
      invalidateSession()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <FormDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={t('assign')}
        form={assignForm}
        onSubmit={async (values) => {
          try {
            await api.assignStocktake(id, {
              assignments: [
                {
                  userId: values.userId,
                  subScope:
                    row.type === 'equipment'
                      ? {
                          locations: values.locations
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }
                      : { warehouseIds: values.warehouseIds },
                },
              ],
            })
            toast.success(t('updated'))
            setAssignOpen(false)
            invalidateSession()
          } catch (error) {
            toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={assignForm.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('assignee')}
                queryKey="stocktake-users"
                loadOptions={staffUserOptions}
                value={field.value || null}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {row.type === 'equipment' ? (
          <TextField control={assignForm.control} name="locations" label={t('locations')} />
        ) : (
          <FormField
            control={assignForm.control}
            name="warehouseIds"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  multiple
                  label={t('warehouses')}
                  queryKey="stocktake-warehouses"
                  loadOptions={(q) => catalogOptions('warehouses', q)}
                  value={field.value}
                  onChange={(value) => field.onChange(Array.isArray(value) ? value : [])}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormDialog>
      <FormDialog
        open={!!extraToLink}
        onOpenChange={(open) => !open && setExtraToLink(null)}
        title={t('linkItem')}
        form={extraForm}
        onSubmit={async (values) => {
          if (!extraToLink) return
          await resolve(extraToLink, { itemId: values.itemId })
          setExtraToLink(null)
        }}
      >
        <FormField
          control={extraForm.control}
          name="itemId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('items')}
                queryKey={`stocktake-items-${id}`}
                loadOptions={async (q) => {
                  const rows =
                    (
                      items.data as
                        { items?: Array<{ id: string; code?: string; name?: string }> } | undefined
                    )?.items ?? []
                  return rows
                    .filter((item) =>
                      `${item.code ?? ''} ${item.name ?? ''}`
                        .toLowerCase()
                        .includes(q.toLowerCase()),
                    )
                    .map((item) => ({
                      id: item.id,
                      code: item.code ?? item.id.slice(0, 8),
                      name: item.name ?? '',
                    }))
                }}
                value={field.value || null}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
      <FormDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        title={t('compare')}
        form={compareForm}
        onSubmit={(values) => {
          setCompareOpen(false)
          navigate(`/stocktakes/${id}/compare?withSessionId=${values.withSessionId}`)
        }}
      >
        <FormField
          control={compareForm.control}
          name="withSessionId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('compareSession')}
                queryKey={`stocktake-compare-${id}`}
                loadOptions={async () => {
                  const result = await api.listStocktakes({
                    type: row.type,
                    status: 'closed',
                    page: 1,
                    limit: 100,
                  })
                  return result.items
                    .filter(
                      (item) =>
                        item.id !== id &&
                        item.scopeType === row.scopeType &&
                        item.scopeId === row.scopeId,
                    )
                    .map((item) => ({ id: item.id, code: item.code, name: item.name }))
                }}
                value={field.value || null}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
      <PageHeader
        title={row.name}
        description={row.code}
        badge={<StatusBadge value={row.status} map={stocktakeStatusMap} />}
        actions={
          <div className="flex flex-wrap gap-2">
            {isStaff && ['draft', 'open'].includes(row.status) && (
              <Button
                variant="outline"
                onClick={() => {
                  assignForm.reset({ userId: '', locations: '', warehouseIds: [] })
                  setAssignOpen(true)
                }}
              >
                {t('assign')}
              </Button>
            )}
            {isStaff && row.status === 'draft' && (
              <Button onClick={() => void run(t('openConfirm'), () => api.openStocktake(id))}>
                {t('open')}
              </Button>
            )}
            {isStaff && row.status === 'open' && (
              <Button onClick={() => void run(t('startCountConfirm'), () => api.startCounting(id))}>
                {t('startCount')}
              </Button>
            )}
            {isStaff && row.status === 'counting' && (
              <Button onClick={() => void run(t('reviewConfirm'), () => api.reviewStocktake(id))}>
                {t('review')}
              </Button>
            )}
            {isAdm && row.status === 'review' && (
              <Button
                onClick={async () => {
                  try {
                    await api.closeStocktake(id)
                    toast.success(t('updated'))
                    invalidateSession()
                  } catch (error) {
                    if (isApiError(error) && error.code === 'STOCKTAKE_UNRESOLVED_DIFFS')
                      setTab('items')
                    if (isApiError(error) && error.code === 'STOCKTAKE_EXTRAS_UNRESOLVED')
                      setTab('extras')
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('close')}
              </Button>
            )}
            {isStaff && row.status !== 'closed' && row.status !== 'cancelled' && (
              <Button
                variant="outline"
                onClick={() => void run(t('cancelConfirm'), () => api.cancelStocktake(id))}
              >
                {t('cancel')}
              </Button>
            )}
            {['review', 'closed'].includes(row.status) && (
              <Button
                variant="outline"
                onClick={() =>
                  api.downloadStocktakeReport(id).catch((error) => toast.error(messageFor(error)))
                }
              >
                {t('report')}
              </Button>
            )}
            {row.status === 'closed' && (
              <Button variant="outline" onClick={() => setCompareOpen(true)}>
                {t('compare')}
              </Button>
            )}
          </div>
        }
      />
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t('scope')}</dt>
          <dd>
            {row.scopeType}
            {row.scopeId ? ` · ${row.scopeId.slice(0, 8)}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('snapshotAt')}</dt>
          <dd>{row.snapshotAt ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('createdBy')}</dt>
          <dd>{row.createdBy?.slice(0, 8) ?? '—'}</dd>
        </div>
      </dl>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="progress">{t('progress')}</TabsTrigger>
          <TabsTrigger value="items">{t('items')}</TabsTrigger>
          {row.status === 'counting' && canCount && (
            <TabsTrigger value="count">{t('countWeb')}</TabsTrigger>
          )}
          <TabsTrigger value="extras">{t('extras')}</TabsTrigger>
          <TabsTrigger value="audit">{t('history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          <p className="text-sm">
            {t('countedOf')} {progress.data?.counted ?? 0}/{progress.data?.total ?? 0} (
            {progress.data?.percent ?? 0}%)
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>{t('assignee')}</th>
                <th>{t('total')}</th>
                <th>{t('counted')}</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {(
                (
                  progress.data as
                    | {
                        byAssignee?: Array<{
                          userId?: string
                          fullName?: string
                          total?: number
                          counted?: number
                          percent?: number
                        }>
                        unassigned?: { total?: number; counted?: number; percent?: number }
                      }
                    | undefined
                )?.byAssignee ?? []
              ).map((entry) => (
                <tr key={entry.userId} className="border-t">
                  <td>{entry.fullName ?? entry.userId?.slice(0, 8)}</td>
                  <td>{entry.total ?? 0}</td>
                  <td>{entry.counted ?? 0}</td>
                  <td>{entry.percent ?? 0}%</td>
                </tr>
              ))}
              {!!(progress.data as { unassigned?: { total?: number } } | undefined)?.unassigned
                ?.total && (
                <tr className="border-t">
                  <td>{t('unassigned')}</td>
                  <td>{(progress.data as { unassigned: { total: number } }).unassigned.total}</td>
                  <td>
                    {(progress.data as { unassigned: { counted?: number } }).unassigned.counted ??
                      0}
                  </td>
                  <td>
                    {(progress.data as { unassigned: { percent?: number } }).unassigned.percent ??
                      0}
                    %
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>
        <TabsContent value="items">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>{t('code')}</th>
                <th>{t('book')}</th>
                <th>{t('count')}</th>
                <th>{t('diff')}</th>
                <th>{t('moved')}</th>
                <th>{t('countedBy')}</th>
                <th>{t('reasonResolution')}</th>
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
                          diffQty?: string
                          movedDuringSession?: boolean
                          countedBy?: string | null
                          countedAt?: string | null
                          diffReason?: string | null
                          resolution?: string | null
                        }[]
                      }
                    | undefined
                )?.items ?? []
              ).map((item) => (
                <tr key={item.id} className="border-t">
                  <td>{item.code ?? item.id}</td>
                  <td>{formatQty(item.bookQty)}</td>
                  <td>{item.countedQty == null ? t('notCounted') : formatQty(item.countedQty)}</td>
                  <td
                    className={
                      item.diffQty?.startsWith('-')
                        ? 'text-destructive'
                        : item.diffQty && item.diffQty !== '0.000'
                          ? 'text-success'
                          : undefined
                    }
                  >
                    {item.countedQty == null ? t('notCounted') : formatQty(item.diffQty)}
                  </td>
                  <td title={item.movedDuringSession ? t('movedHint') : undefined}>
                    {item.movedDuringSession ? '⚠' : ''}
                  </td>
                  <td>
                    {item.countedBy?.slice(0, 8) ?? '—'}
                    {item.countedAt ? ` · ${item.countedAt}` : ''}
                  </td>
                  <td>
                    {item.diffReason ?? '—'} / {item.resolution ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
        {row.status === 'counting' && canCount && (
          <TabsContent value="count">
            {pkg.isSuccess ? (
              <CountPanel sessionId={id} items={pkg.data.items} onSent={invalidateSession} />
            ) : (
              <p role="status">{t('loadingPackage')}</p>
            )}
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
                        extraForm.reset({ itemId: '' })
                        setExtraToLink(item.id)
                      }}
                    >
                      {t('linkItem')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void resolve(item.id, { ignore: true })}
                    >
                      {t('ignore')}
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
