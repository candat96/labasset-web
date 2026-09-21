import Big from 'big.js'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ActionMenu } from '@/components/page/ActionMenu'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { Timeline } from '@/components/timeline'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ErrorState } from '@/components/page/ErrorState'
import {
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  PackagePlus,
  Pencil,
  Printer,
  Trash2,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { qcStatusMap, stockDocStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { api, unwrapAs } from '@/api/client'
import { allDepartments, catalogOptions, supplyOptions } from '@/api/references'
import { downloadFile } from '@/api/download'
import { cancelReceipt, deleteReceipt, getReceipt, postReceipt, qcReceipt } from '../api'
import { useTranslation } from 'react-i18next'

function lineTotal(qty: string, cost: string) {
  try {
    return new Big(qty || '0').times(cost || '0').toString()
  } catch {
    return '0'
  }
}

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: !!id,
  })
  const supplies = useQuery({
    queryKey: ['supply-options', 'receipt', id],
    queryFn: () => supplyOptions(''),
  })
  const warehouses = useQuery({
    queryKey: ['catalog-options', 'warehouses'],
    queryFn: () => catalogOptions('warehouses', ''),
  })
  const suppliers = useQuery({
    queryKey: ['catalog-options', 'suppliers'],
    queryFn: () => catalogOptions('suppliers', ''),
  })
  const departments = useQuery({ queryKey: ['references', 'departments'], queryFn: allDepartments })
  const settings = useQuery({
    queryKey: ['settings', 'stock-cancel-window'],
    queryFn: () => unwrapAs<Record<string, unknown>>(api.GET('/v1/settings')),
    enabled: isAdm,
  })
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <DetailSkeleton label={t('loadingReceipt')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const extended = row as typeof row & {
    warnings?: string[]
    supplierId?: string | null
    fromDepartmentId?: string | null
    invoiceNo?: string | null
    invoiceDate?: string | null
    notes?: string | null
    qcNote?: string | null
  }
  const nameOf = (list: { id: string; name: string }[] | undefined, id?: string | null) =>
    id ? (list?.find((x) => x.id === id)?.name ?? id) : null
  const warehouseName = nameOf(warehouses.data, row.warehouseId)
  const supplierName = nameOf(suppliers.data, extended.supplierId)
  const fromDepartmentName = nameOf(departments.data, extended.fromDepartmentId)
  const typeLabel =
    row.type === 'purchase'
      ? t('receiptTypePurchase')
      : row.type === 'return_from_dept'
        ? t('receiptTypeReturn')
        : t('receiptTypeAdjustIn')
  const receiptItems = row.items as Array<
    (typeof row.items)[number] & { lotId?: string; supplyName?: string }
  >
  const supplyNames = new Map((supplies.data ?? []).map((option) => [option.id, option.name]))
  const windowDays = Number(settings.data?.['stock.cancelWindowDays'] ?? 30)
  const daysRemaining = row.postedAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(row.postedAt).getTime() + windowDays * 86_400_000 - Date.now()) / 86_400_000,
        ),
      )
    : 0
  return (
    <>
      {dialog}
      <PageHeader
        eyebrow={t('receiptsTitle')}
        title={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={stockDocStatusMap} />
            {row.qcStatus && <StatusBadge value={row.qcStatus} map={qcStatusMap} />}
          </div>
        }
        meta={
          <>
            <PageMeta icon={<PackagePlus />}>{typeLabel}</PageMeta>
            {warehouseName && <PageMeta icon={<Warehouse />}>{warehouseName}</PageMeta>}
            {supplierName && <PageMeta icon={<Truck />}>{supplierName}</PageMeta>}
            {fromDepartmentName && <PageMeta icon={<Building2 />}>{fromDepartmentName}</PageMeta>}
            {row.receivedAt && (
              <PageMeta icon={<CalendarDays />}>
                {t('receivedAt')}: {formatDate(row.receivedAt)}
              </PageMeta>
            )}
          </>
        }
        actions={
          <ActionMenu
            items={[
              canWrite &&
                row.status === 'draft' && {
                  key: 'post',
                  label: t('post'),
                  variant: 'primary' as const,
                  onClick: () => {
                    void (async () => {
                      if ((await confirm({ title: t('postConfirm') })) === false) return
                      try {
                        await postReceipt(id)
                        toast.success(t('posted'))
                        invalidate()
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    })()
                  },
                },
              canWrite &&
                row.status === 'posted' &&
                row.qcStatus === 'pending' && {
                  key: 'qcPass',
                  label: t('qcPassed'),
                  variant: 'primary' as const,
                  icon: <CheckCircle2 />,
                  onClick: () => {
                    void (async () => {
                      try {
                        await qcReceipt(id, { status: 'passed' })
                        toast.success(t('qcPassed'))
                        invalidate()
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    })()
                  },
                },
              canWrite &&
                row.status === 'posted' &&
                row.qcStatus === 'pending' && {
                  key: 'qcFail',
                  label: t('qcFailed'),
                  icon: <XCircle />,
                  onClick: () => {
                    void (async () => {
                      const note = await confirm({ title: t('qcFailed'), requireReason: true })
                      if (note === false) return
                      try {
                        await qcReceipt(id, { status: 'failed', note })
                        toast.success(t('qcFailed'))
                        invalidate()
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    })()
                  },
                },
              canWrite &&
                row.status === 'draft' && {
                  key: 'edit',
                  label: t('edit'),
                  icon: <Pencil />,
                  to: `/stock/receipts/${id}/edit`,
                },
              {
                key: 'print',
                label: t('print'),
                icon: <Printer />,
                onClick: () =>
                  void downloadFile(
                    `/v1/stock/receipts/${id}/print.pdf`,
                    {},
                    `${row.code}.pdf`,
                  ).catch((error) => toast.error(messageFor(error))),
              },
              isAdm &&
                row.status === 'posted' && {
                  key: 'cancel',
                  label: t('cancelWithDays', { days: daysRemaining }),
                  variant: 'destructive' as const,
                  icon: <Ban />,
                  separator: true,
                  onClick: () => {
                    void (async () => {
                      if (
                        (await confirm({ title: t('cancelConfirm'), destructive: true })) === false
                      )
                        return
                      try {
                        await cancelReceipt(id)
                        toast.success(t('cancelled'))
                        invalidate()
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    })()
                  },
                },
              canWrite &&
                row.status === 'draft' && {
                  key: 'delete',
                  label: t('delete'),
                  variant: 'destructive' as const,
                  icon: <Trash2 />,
                  separator: true,
                  onClick: () => {
                    void (async () => {
                      if (
                        (await confirm({ title: t('deleteConfirm'), destructive: true })) === false
                      )
                        return
                      try {
                        await deleteReceipt(id)
                        invalidate()
                        navigate('/stock/receipts')
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    })()
                  },
                },
            ]}
          />
        }
      />
      {!!extended.warnings?.length && (
        <Alert variant="warning" className="mb-5" role="alert">
          <AlertTitle>{t('receiptWarnings')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {extended.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title={t('items', { defaultValue: 'Vật tư nhập' })}
            description={`${receiptItems.length} ${t('supply', { defaultValue: 'vật tư' }).toLowerCase()}`}
            flush
            footer={
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[13px]">{t('totalAmount')}</span>
                <span className="text-[16px] font-bold tabular-nums">
                  {formatVnd(row.totalAmount)}
                </span>
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t('supply', { defaultValue: 'Vật tư' })}</TableHead>
                  <TableHead>{t('lot')}</TableHead>
                  <TableHead>{t('expiresAt', { defaultValue: 'Hạn dùng' })}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unitCost')}</TableHead>
                  <TableHead className="pr-5 text-right">
                    {t('lineTotalLabel', { defaultValue: 'Thành tiền' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-5 font-medium">
                      {item.supplyName ??
                        supplyNames.get(item.supplyId) ??
                        item.supplyId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      {item.lotId ? (
                        <Link
                          className="text-primary font-medium hover:underline"
                          to={`/stock/lots?lotId=${item.lotId}`}
                        >
                          {item.lotNo ?? t('lot')}
                        </Link>
                      ) : (
                        (item.lotNo ?? <span className="text-subtle">—</span>)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.expiresAt ? (
                        formatDate(item.expiresAt)
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(item.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatVnd(item.unitCost)}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-medium tabular-nums">
                      {formatVnd(lineTotal(item.quantity, item.unitCost))}
                    </TableCell>
                  </TableRow>
                ))}
                {receiptItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                      {t('noItems', { defaultValue: 'Chưa có dòng vật tư' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title={t('attachments', { defaultValue: 'Đính kèm' })}>
            <AttachmentsPanel
              entityType="stock_receipt"
              entityId={id}
              kinds={[
                { value: 'invoice', label: t('attachmentInvoice') },
                { value: 'delivery_note', label: t('attachmentDelivery') },
                { value: 'qc_report', label: 'QC' },
                { value: 'other', label: t('attachmentOther') },
              ]}
            />
          </SectionCard>
        </div>
        <div className="space-y-5">
          <SectionCard title={t('info', { defaultValue: 'Thông tin' })}>
            <DataList
              columns={1}
              items={[
                { label: t('type'), value: typeLabel },
                { label: t('warehouse'), value: warehouseName },
                ...(row.type === 'purchase' ? [{ label: t('supplier'), value: supplierName }] : []),
                ...(row.type === 'return_from_dept'
                  ? [{ label: t('fromDepartment'), value: fromDepartmentName }]
                  : []),
                {
                  label: t('receivedAt'),
                  value: row.receivedAt ? formatDate(row.receivedAt) : null,
                },
                { label: t('invoiceNo'), value: extended.invoiceNo },
                {
                  label: t('invoiceDate'),
                  value: extended.invoiceDate ? formatDate(extended.invoiceDate) : null,
                },
                { label: t('totalAmount'), value: formatVnd(row.totalAmount) },
                { label: t('notes'), value: extended.notes, full: true },
                ...(extended.qcNote
                  ? [
                      {
                        label: t('qcNote', { defaultValue: 'Ghi chú QC' }),
                        value: extended.qcNote,
                        full: true,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
          <SectionCard title={t('history', { defaultValue: 'Lịch sử' })}>
            <Timeline
              events={[
                ...(row.receivedAt
                  ? [
                      {
                        at: row.receivedAt,
                        title: t('receivedAt'),
                        tone: 'muted' as const,
                        icon: <FileText />,
                      },
                    ]
                  : []),
                ...(row.postedAt
                  ? [
                      {
                        at: row.postedAt,
                        title: t('posted'),
                        by: row.postedBy ? row.postedBy.slice(0, 8) : undefined,
                        tone: 'success' as const,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
        </div>
      </div>
      <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })} className="mt-5">
        <AuditTrail entityType="stock_receipt" entityId={id} />
      </SectionCard>
      <Button variant="link" asChild className="mt-2 px-0">
        <Link to="/stock/receipts">{t('backToList')}</Link>
      </Button>
    </>
  )
}
