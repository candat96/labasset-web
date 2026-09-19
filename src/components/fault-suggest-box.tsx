import { useQuery } from '@tanstack/react-query'
import { suggestFaults } from '@/api/faults'
import { messageFor } from '@/api/errors'
import { StatusBadge } from '@/components/status-badge'
import { faultSeverityMap } from '@/lib/status-maps'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FaultSuggestBox({
  equipmentId,
  errorCode,
  q,
  value,
  onSelect,
}: {
  equipmentId?: string
  errorCode?: string
  q?: string
  value?: string | null
  onSelect: (faultId: string) => void
}) {
  const enabled = !!equipmentId
  const query = useQuery({
    queryKey: ['faults', 'suggest', equipmentId, errorCode, q],
    queryFn: () => suggestFaults({ equipmentId: equipmentId!, errorCode, q }),
    enabled,
  })
  if (!enabled) {
    return <p className="text-muted-foreground text-sm">Chọn máy để xem gợi ý lỗi.</p>
  }
  if (query.isPending) return <p role="status">Đang tải gợi ý lỗi…</p>
  if (query.error)
    return (
      <p role="alert">
        {messageFor(query.error)}{' '}
        <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </p>
    )
  const items = (query.data ?? []).slice(0, 5)
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">Không có gợi ý lỗi.</p>
  return (
    <ul className="space-y-2" aria-label="Gợi ý lỗi">
      {items.map((row) => {
        const selected = value === row.fault.id
        return (
          <li key={row.fault.id}>
            <button
              type="button"
              className={cn(
                'w-full rounded-lg border p-3 text-left',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              )}
              onClick={() => onSelect(row.fault.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.fault.title}</span>
                <StatusBadge value={row.fault.severity} map={faultSeverityMap} />
                {row.fault.errorCode && (
                  <span className="text-muted-foreground font-mono text-xs">
                    {row.fault.errorCode}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                đã gặp {row.occurrences.onEquipment} lần trên máy này / {row.occurrences.sameModel}{' '}
                lần cùng model
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
