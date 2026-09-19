import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { Timeline } from '@/components/timeline'
import { useConfirm } from '@/components/confirm-dialog'
import { calibrationResultMap, calibrationStatusMap, calibrationTypeMap } from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { calibrationHistory, cancelCalibration, completeCalibration, getCalibration } from '../api'

export function Component() {
  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['calibrations', id],
    queryFn: () => getCalibration(id),
    enabled: !!id,
  })
  const isStaff = useCan(STAFF)
  const isAdm = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  const history = useQuery({
    queryKey: ['calibrations', 'history', detail.data?.equipmentId],
    queryFn: () => calibrationHistory(detail.data!.equipmentId),
    enabled: !!detail.data?.equipmentId,
  })
  if (detail.isPending) return <p role="status">Đang tải kiểm định…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  return (
    <>
      {dialog}
      <PageHeader
        title={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={calibrationStatusMap} />
            <StatusBadge value={row.type} map={calibrationTypeMap} />
            {row.result && <StatusBadge value={row.result} map={calibrationResultMap} />}
          </div>
        }
        actions={
          <div className="flex gap-2">
            {isStaff && row.status === 'scheduled' && (
              <Button
                onClick={async () => {
                  await completeCalibration(id, {
                    performedAt: new Date().toISOString(),
                    result: 'pass',
                  })
                  toast.success('Đã hoàn thành')
                  void detail.refetch()
                }}
              >
                Hoàn thành
              </Button>
            )}
            {isAdm && row.status === 'scheduled' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: 'Huỷ phiếu?', destructive: true })) === false) return
                  await cancelCalibration(id)
                  toast.success('Đã huỷ')
                  void detail.refetch()
                }}
              >
                Huỷ
              </Button>
            )}
          </div>
        }
      />
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Máy</dt>
          <dd>
            <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
              {row.equipment?.code} – {row.equipment?.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lịch</dt>
          <dd>{formatDateTime(row.scheduledAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Thực hiện</dt>
          <dd>{formatDateTime(row.performedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chứng nhận</dt>
          <dd>{row.certificateNo ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chi phí</dt>
          <dd>{formatVnd(row.cost) || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Hạn kế tiếp</dt>
          <dd>{formatDate(row.nextDueAt) || '—'}</dd>
        </div>
        {row.repairTicketId && (
          <div>
            <dt className="text-muted-foreground">Phiếu sửa</dt>
            <dd>
              <Link className="text-primary hover:underline" to={`/repairs/${row.repairTicketId}`}>
                {row.repairTicketId}
              </Link>
            </dd>
          </div>
        )}
      </dl>
      <h2 className="mt-6 mb-2 font-medium">Lịch sử máy</h2>
      <Timeline
        events={(history.data ?? []).map((item) => ({
          at: item.performedAt ?? item.scheduledAt ?? item.createdAt,
          title: `${item.code} · ${item.result ?? item.status}`,
        }))}
      />
    </>
  )
}
