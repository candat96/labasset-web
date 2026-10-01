import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { StatusBadge } from '@/components/status-badge'
import { lotStatusMap } from '@/lib/status-maps'
import { formatQty } from '@/lib/format/number'
import { formatDate } from '@/lib/format/date'
import { listLots } from '../api'

type LotRow = {
  id: string
  lotNo: string | null
  expiresAt: string | null
  qtyOnHand: string
  qtyReserved: string
  status: string
}

/**
 * Các lô của một vật tư tại một kho.
 *
 * Tồn kho gộp theo vật tư nên một dòng có thể là nhiều lô với hạn dùng khác nhau;
 * người giữ kho cần thấy ngay lô nào sắp hết hạn mà không phải sang màn khác rồi
 * tự lọc lại.
 */
export function LotsOfBalanceDialog({
  supplyId,
  supplyName,
  warehouseId,
  warehouseName,
  onClose,
}: {
  supplyId: string
  supplyName: string
  warehouseId: string
  warehouseName: string
  onClose: () => void
}) {
  const { t } = useTranslation('inventory')
  const lots = useQuery({
    queryKey: ['stock', 'lots', supplyId, warehouseId],
    queryFn: () => listLots({ supplyId, warehouseId, all: true }),
  })
  const rows = ((lots.data as { items?: LotRow[] } | undefined)?.items ?? []) as LotRow[]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {supplyName} — {warehouseName}
          </DialogTitle>
        </DialogHeader>
        {lots.error ? (
          <ErrorState error={lots.error} onRetry={() => void lots.refetch()} />
        ) : rows.length === 0 && !lots.isPending ? (
          <EmptyState title={t('noLots')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('lotNo')}</TableHead>
                <TableHead>{t('expiresAt')}</TableHead>
                <TableHead className="text-right">{t('qty')}</TableHead>
                <TableHead className="text-right">{t('reserved')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-mono text-xs">{lot.lotNo ?? '—'}</TableCell>
                  <TableCell>{lot.expiresAt ? formatDate(lot.expiresAt) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(lot.qtyOnHand)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(lot.qtyReserved)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={lot.status} map={lotStatusMap} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
