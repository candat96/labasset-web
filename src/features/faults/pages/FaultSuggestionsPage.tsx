import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { useConfirm } from '@/components/confirm-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { suggestionStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import {
  acceptFaultSuggestion,
  getFaultSuggestion,
  getRepairCode,
  listFaults,
  listFaultSuggestions,
  rejectFaultSuggestion,
} from '../api'
import { faultKeys, useInvalidateSuggestions, useUserNames } from '../hooks'
import type { FaultProposal } from '../types'

export function Component() {
  const { t } = useTranslation('faults')
  const { t: tc } = useTranslation()
  const isAdm = useCan(ADM)
  const table = useServerTable({ filterKeys: ['status'] })
  const status = (table.params.filters.status ?? 'pending') as 'pending' | 'accepted' | 'rejected'
  const list = useQuery({
    queryKey: [...faultKeys.suggestions, { ...table.params, status }],
    queryFn: () =>
      listFaultSuggestions({
        page: table.params.page,
        limit: table.params.limit,
        status,
      }),
    enabled: isAdm,
  })
  const userName = useUserNames()
  const { confirm, dialog } = useConfirm()
  const invalidate = useInvalidateSuggestions()
  const [openId, setOpenId] = useState<string | null>(null)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'merge'>('create')
  const [mergeId, setMergeId] = useState<string | null>(null)
  const detail = useQuery({
    queryKey: faultKeys.suggestion(openId ?? ''),
    queryFn: () => getFaultSuggestion(openId!),
    enabled: !!openId,
  })
  const ticketIds = useMemo(
    () =>
      [...new Set((list.data?.items ?? []).map((row) => row.repairTicketId))]
        .filter((id): id is string => !!id)
        .sort(),
    [list.data?.items],
  )
  const tickets = useQuery({
    queryKey: ['faults', 'suggestions', 'tickets', ticketIds.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        ticketIds.map(async (id) => [id, (await getRepairCode(id)).code] as const),
      )
      return Object.fromEntries(entries)
    },
    enabled: isAdm && ticketIds.length > 0,
    staleTime: 60_000,
  })
  const accept = useMutation({
    mutationFn: () =>
      acceptFaultSuggestion(openId!, mode === 'merge' ? (mergeId ?? undefined) : undefined),
    onSuccess: () => {
      toast.success(t('suggestions.accepted'))
      setAcceptOpen(false)
      setOpenId(null)
      invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const reject = useMutation({
    mutationFn: (reviewNote: string) => rejectFaultSuggestion(openId!, reviewNote),
    onSuccess: () => {
      toast.success(t('suggestions.rejected'))
      setOpenId(null)
      invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns = useMemo<ColumnDef<FaultProposal>[]>(
    () => [
      {
        accessorKey: 'payload.title',
        header: t('columns.title'),
        cell: ({ row }) => row.original.payload.title,
      },
      {
        id: 'ticket',
        header: t('suggestions.ticket'),
        cell: ({ row }) =>
          row.original.repairTicketId ? (
            <Link
              className="text-primary hover:underline"
              to={`/repairs/${row.original.repairTicketId}`}
              onClick={(event) => event.stopPropagation()}
            >
              {tickets.data?.[row.original.repairTicketId] ?? row.original.repairTicketId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'proposedBy',
        header: t('suggestions.proposedBy'),
        cell: ({ row }) => userName(row.original.proposedBy),
      },
      {
        accessorKey: 'createdAt',
        header: t('suggestions.createdAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: t('suggestions.status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={suggestionStatusMap} />,
      },
    ],
    [t, tickets.data, userName],
  )
  if (!isAdm) return <p role="alert">{t('suggestions.forbidden')}</p>
  const payload = detail.data?.payload
  return (
    <>
      {dialog}
      <PageHeader title={t('suggestions.title')} />
      <DataTable
        tableId="fault-suggestions"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
      />
      <Sheet open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{payload?.title ?? t('suggestions.sheetTitle')}</SheetTitle>
          </SheetHeader>
          {detail.isPending && <p role="status">{t('suggestions.loading')}</p>}
          {detail.error && <p role="alert">{messageFor(detail.error)}</p>}
          {payload && (
            <div className="space-y-3 p-4 text-sm">
              {detail.data?.repairTicketId && (
                <p>
                  {t('suggestions.ticket')}:{' '}
                  <Link
                    className="text-primary hover:underline"
                    to={`/repairs/${detail.data.repairTicketId}`}
                  >
                    {tickets.data?.[detail.data.repairTicketId] ?? detail.data.repairTicketId}
                  </Link>
                </p>
              )}
              <p>
                {t('suggestions.proposedBy')}: {userName(detail.data?.proposedBy)}
              </p>
              {payload.errorCode && (
                <p>{t('suggestions.errorCode', { code: payload.errorCode })}</p>
              )}
              {payload.symptoms && (
                <p className="whitespace-pre-wrap">
                  {t('suggestions.symptoms', { text: payload.symptoms })}
                </p>
              )}
              <div>
                <p className="font-medium">{t('suggestions.steps')}</p>
                <ol className="list-decimal pl-5">
                  {(payload.steps ?? []).map((step, index) => (
                    <li key={index}>{step.instruction}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-medium">{t('suggestions.parts')}</p>
                <ul>
                  {(payload.parts ?? []).map((part, index) => (
                    <li key={index}>
                      {part.name} × {part.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              {detail.data?.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => setAcceptOpen(true)}>{t('suggestions.accept')}</Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const reason = await confirm({
                        title: t('suggestions.rejectTitle'),
                        requireReason: true,
                        destructive: true,
                        confirmLabel: t('suggestions.reject'),
                      })
                      if (reason === false) return
                      reject.mutate(reason)
                    }}
                  >
                    {t('suggestions.reject')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('suggestions.acceptTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accept-mode"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
              />
              {t('suggestions.createNew')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accept-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              {t('suggestions.merge')}
            </label>
            {mode === 'merge' && (
              <AsyncSelect
                label={t('suggestions.target')}
                queryKey="faults-merge"
                loadOptions={async (q) => {
                  const page = await listFaults({ q, page: 1, limit: 50 })
                  return page.items.map((item) => ({
                    id: item.id,
                    code: item.errorCode ?? '',
                    name: item.title,
                  }))
                }}
                value={mergeId}
                onChange={(value) => setMergeId(typeof value === 'string' ? value : null)}
                clearable
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>
              {tc('actions.cancel')}
            </Button>
            <Button
              disabled={accept.isPending || (mode === 'merge' && !mergeId)}
              onClick={() => accept.mutate()}
            >
              {tc('actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
