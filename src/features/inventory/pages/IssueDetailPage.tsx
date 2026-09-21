import { useState } from 'react'
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
  ClipboardList,
  PackageMinus,
  Pencil,
  PenLine,
  Printer,
  Trash2,
  TriangleAlert,
  User,
  Warehouse,
  Wrench,
} from 'lucide-react'
import { formatDate } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { allDepartments, catalogOptions, supplyOptions } from '@/api/references'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/signature-pad'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { stockDocStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { downloadFile } from '@/api/download'
import { uploadFile } from '@/api/files'
import { cancelIssue, deleteIssue, getIssue, postIssue, updateIssue } from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['stock', 'issues', id],
    queryFn: () => getIssue(id),
    enabled: !!id,
  })
  const supplies = useQuery({
    queryKey: ['supply-options', 'issue', id],
    queryFn: () => supplyOptions(''),
  })
  const warehouses = useQuery({
    queryKey: ['catalog-options', 'warehouses'],
    queryFn: () => catalogOptions('warehouses', ''),
  })
  const departments = useQuery({ queryKey: ['references', 'departments'], queryFn: allDepartments })
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const [signOpen, setSignOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <DetailSkeleton label={t('loadingIssue')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const extended = row as typeof row & {
    toDepartmentId?: string | null
    receiverName?: string | null
    reason?: string | null
    notes?: string | null
    requestId?: string | null
    repairTicketId?: string | null
    maintenanceTaskId?: string | null
    equipmentId?: string | null
  }
  const nameOf = (list: { id: string; name: string }[] | undefined, key?: string | null) =>
    key ? (list?.find((x) => x.id === key)?.name ?? key) : null
  const supplyNames = new Map((supplies.data ?? []).map((option) => [option.id, option.name]))
  const warehouseName = nameOf(warehouses.data, row.warehouseId)
  const toDepartmentName = nameOf(departments.data, extended.toDepartmentId)
  const typeLabels: Record<typeof row.type, string> = {
    to_department: t('issueTypeToDepartment'),
    for_repair: t('issueTypeRepair'),
    for_maintenance: t('issueTypeMaintenance'),
    dispose: t('issueTypeDispose'),
    return_to_supplier: t('issueTypeReturnSupplier'),
    adjust_out: t('issueTypeAdjustOut'),
  }
  const typeLabel = typeLabels[row.type] ?? row.type
  return (
    <>
      {dialog}
      <PageHeader
        eyebrow={t('issuesTitle')}
        title={row.code}
        badge={<StatusBadge value={row.status} map={stockDocStatusMap} />}
        meta={
          <>
            <PageMeta icon={<PackageMinus />}>{typeLabel}</PageMeta>
            {warehouseName && <PageMeta icon={<Warehouse />}>{warehouseName}</PageMeta>}
            {toDepartmentName && <PageMeta icon={<Building2 />}>{toDepartmentName}</PageMeta>}
            {extended.receiverName && <PageMeta icon={<User />}>{extended.receiverName}</PageMeta>}
            {row.issuedAt && (
              <PageMeta icon={<CalendarDays />}>
                {t('issuedAt')}: {formatDate(row.issuedAt)}
              </PageMeta>
            )}
            {extended.requestId && (
              <PageMeta icon={<ClipboardList />}>
                <Link
                  className="text-primary hover:underline"
                  to={`/requests/${extended.requestId}`}
                >
                  {t('request', { defaultValue: 'Phiếu yêu cầu' })}
                </Link>
              </PageMeta>
            )}
            {extended.repairTicketId && (
              <PageMeta icon={<Wrench />}>
                <Link
                  className="text-primary hover:underline"
                  to={`/repairs/${extended.repairTicketId}`}
                >
                  {t('issueTypeRepair')}
                </Link>
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
                        await postIssue(id)
                        toast.success(t('posted'))
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
                  to: `/stock/issues/${id}/edit`,
                },
              canWrite &&
                row.status === 'draft' && {
                  key: 'sign',
                  label: t('receiverSignature'),
                  icon: <PenLine />,
                  onClick: () => setSignOpen(true),
                },
              {
                key: 'print',
                label: t('print'),
                icon: <Printer />,
                onClick: () =>
                  void downloadFile(
                    `/v1/stock/issues/${id}/print.pdf`,
                    {},
                    `${row.code}.pdf`,
                  ).catch((error) => toast.error(messageFor(error))),
              },
              isAdm &&
                row.status === 'posted' && {
                  key: 'cancel',
                  label: t('cancel'),
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
                        await cancelIssue(id)
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
                        await deleteIssue(id)
                        invalidate()
                        navigate('/stock/issues')
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
      {row.fefoWarning && (
        <Alert variant="warning" className="mb-5" role="alert">
          <TriangleAlert />
          <AlertTitle>{t('fefoWarning')}</AlertTitle>
          <AlertDescription>
            {t('fefoWarningHint', {
              defaultValue: 'Có lô hạn dùng gần hơn chưa được xuất trước.',
            })}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title={t('issueItems', { defaultValue: 'Vật tư xuất' })}
            description={`${row.items.length} ${t('supply', { defaultValue: 'vật tư' }).toLowerCase()}`}
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t('supply', { defaultValue: 'Vật tư' })}</TableHead>
                  <TableHead>{t('lot')}</TableHead>
                  <TableHead className="pr-5 text-right">{t('quantity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.items.map((item, index) => {
                  const lotId = (item as { lotId?: string | null }).lotId
                  const lotNo = (item as { lotNo?: string | null }).lotNo
                  return (
                    <TableRow key={`${item.supplyId}-${index}`}>
                      <TableCell className="pl-5 font-medium">
                        {supplyNames.get(item.supplyId) ?? item.supplyId}
                      </TableCell>
                      <TableCell>
                        {lotId ? (
                          <Link
                            className="text-primary font-medium hover:underline"
                            to={`/stock/lots?lotId=${lotId}`}
                          >
                            {lotNo ?? t('lot')}
                          </Link>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 text-right tabular-nums">
                        {formatQty(item.quantity)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {row.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                      {t('noItems', { defaultValue: 'Chưa có dòng vật tư' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title={t('attachments', { defaultValue: 'Đính kèm' })}>
            <AttachmentsPanel
              entityType="stock_issue"
              entityId={id}
              kinds={[
                { value: 'signature', label: t('attachmentSignature') },
                { value: 'photo', label: t('attachmentPhoto') },
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
                ...(extended.toDepartmentId
                  ? [{ label: t('toDepartment'), value: toDepartmentName }]
                  : []),
                { label: t('receiverName'), value: extended.receiverName },
                { label: t('issuedAt'), value: row.issuedAt ? formatDate(row.issuedAt) : null },
                { label: t('reason'), value: extended.reason, full: true },
                { label: t('notes'), value: extended.notes, full: true },
              ]}
            />
          </SectionCard>
          <SectionCard title={t('history', { defaultValue: 'Lịch sử' })}>
            <Timeline
              events={[
                ...(row.issuedAt
                  ? [{ at: row.issuedAt, title: t('issuedAt'), tone: 'muted' as const }]
                  : []),
                ...(row.postedAt
                  ? [{ at: row.postedAt, title: t('posted'), tone: 'success' as const }]
                  : []),
              ]}
            />
          </SectionCard>
        </div>
      </div>
      <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })} className="mt-5">
        <AuditTrail entityType="stock_issue" entityId={id} />
      </SectionCard>
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('receiverSignature')}</DialogTitle>
          </DialogHeader>
          <SignaturePad onFile={setSignatureFile} />
          <DialogFooter>
            <Button
              disabled={!signatureFile}
              onClick={async () => {
                if (!signatureFile) return
                try {
                  const fileId = await uploadFile(signatureFile)
                  await updateIssue(id, { receiverSignatureFileId: fileId })
                  toast.success(t('signatureSaved'))
                  setSignOpen(false)
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
