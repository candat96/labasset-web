import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import Big from 'big.js'
import { toast } from 'sonner'
import { CalendarClock, Coins, Download, Link2, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { ErrorState } from '@/components/page/ErrorState'
import { StatusBadge } from '@/components/status-badge'
import { ActionMenu } from '@/components/page/ActionMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormDialog } from '@/components/form/FormDialog'
import { AsyncSelect } from '@/components/form/async-select'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { formatDate } from '@/lib/format/date'
import { demandItemTypeLabels, demandPriorityLabels, enumLabel } from '@/lib/enum-labels'
import { demandRequestStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { HEADS, STAFF } from '@/routes/roles'
import { supplyOptions } from '@/api/references'
import { useAuthStore } from '@/stores/auth.store'
import * as api from '../api'
import type { DemandItemType, DemandLine, DemandPeriod, DemandRequest } from '../paths'
import { useTranslation } from 'react-i18next'

/** Chia đều tổng vào `n` khoảng; phần dư dồn khoảng cuối (chuỗi Decimal). */
export function splitEvenly(total: string, n: number): string[] {
  try {
    const big = new Big(String(total || '0'))
    if (big.lte(0) || n <= 0) return Array.from({ length: n }, () => '0')
    const base = big.div(n).round(3, Big.roundDown)
    const rest = big.minus(base.mul(n))
    const cells = Array.from({ length: n }, () => base.toString())
    if (rest.gt(0)) cells[n - 1] = base.plus(rest).toString()
    return cells
  } catch {
    return Array.from({ length: n }, () => '0')
  }
}

/** Σ chuỗi Decimal bằng Big.js — không dùng parseFloat (sai số). */
export function sumQty(cells: string[]): string {
  try {
    return cells.reduce((s, c) => s.plus(new Big(String(c || '0'))), new Big(0)).toFixed()
  } catch {
    return '0'
  }
}

function bucketLabels(buckets: number): string[] {
  if (buckets === 4) return ['Q1', 'Q2', 'Q3', 'Q4']
  if (buckets === 1) return ['Tổng']
  return Array.from({ length: 12 }, (_, i) => `T${i + 1}`)
}

/** Decimal(19,4) "30.0000" → "30" (chỉ để HIỂN THỊ, không đổi dữ liệu gửi lên). */
export function trimZeroTail(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value
}

/** Ô số lượng theo bucket — commit khi blur/Enter, ô trống → 0. */
function BucketCell({
  value,
  disabled,
  onCommit,
  ariaLabel,
}: {
  value: string
  disabled?: boolean
  onCommit: (value: string) => void
  ariaLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === '0' ? '' : trimZeroTail(value))
  return (
    <Input
      aria-label={ariaLabel}
      className="h-7 w-11 px-1 text-center text-[12px] tabular-nums"
      inputMode="decimal"
      value={shown}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = (draft ?? '').trim()
        setDraft(null)
        onCommit(next === '' ? '0' : next)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function TypeSelect({
  value,
  disabled,
  onChange,
}: {
  value: DemandItemType
  disabled?: boolean
  onChange: (value: DemandItemType) => void
}) {
  const { t } = useTranslation('procurement')
  return (
    <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v as DemandItemType)}>
      <SelectTrigger aria-label={t('itemType')} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(demandItemTypeLabels).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Chip "Gợi ý: 1.200 (tiêu hao 12T 1.100 · tồn 150 · còn 41 ngày)" — bấm để áp. */
function SuggestChip({ line, onClick }: { line: DemandLine; onClick: () => void }) {
  const { t } = useTranslation('procurement')
  const s = line.suggestion
  if (!s) return null
  const parts: string[] = []
  if (s.basis)
    parts.push(enumLabel({ consumption: 'tiêu hao', min_stock: 'tồn tối thiểu' }, s.basis))
  if (s.consumption12m != null) parts.push(`12T ${s.consumption12m}`)
  if (s.onHand != null) parts.push(`tồn ${s.onHand}`)
  if (s.runwayDays != null) parts.push(`còn ${s.runwayDays} ngày`)
  return (
    <button
      type="button"
      onClick={onClick}
      className="ring-primary/20 bg-primary/5 hover:bg-primary/10 max-w-56 truncate rounded-full px-2 py-0.5 text-left text-[11.5px] text-primary ring-1"
      title={`${t('suggestedQtyHint', { defaultValue: 'Gợi ý' })}: ${line.suggestedQty} (${parts.join(' · ')})`}
    >
      <Sparkles className="mr-1 inline size-3 align-[-1px]" />
      {line.suggestedQty}
      <span className="text-subtle ml-1">({parts.join(' · ')})</span>
    </button>
  )
}

function LineRow({
  line,
  buckets,
  editable,
  staffEditable,
  periodKind,
  departmentId,
  onDataChanged,
}: {
  line: DemandLine
  buckets: number
  editable: boolean
  staffEditable: boolean
  periodKind: 'annual' | 'quarterly' | 'adhoc'
  departmentId: string
  onDataChanged: () => void
}) {
  const { t } = useTranslation('procurement')
  const qc = useQueryClient()
  const [itemType, setItemType] = useState<DemandItemType>(line.itemType)
  const [supplyId, setSupplyId] = useState<string | null>(line.supplyId ?? null)
  const [itemName, setItemName] = useState(line.itemName)
  const [spec, setSpec] = useState(line.spec ?? '')
  const [reason, setReason] = useState(line.reason ?? '')
  const [priority, setPriority] = useState(line.priority)
  const [unitPriceEst, setUnitPriceEst] = useState(trimZeroTail(line.unitPriceEst))
  const labels = useMemo(() => bucketLabels(buckets), [buckets])
  const zeros = useMemo(() => Array.from({ length: buckets }, () => '0'), [buckets])
  const [qty, setQty] = useState<string[]>(
    line.qtyByBucket.length === buckets ? line.qtyByBucket : zeros,
  )

  const qtySum = sumQty(qty)
  const amount = useMemo(() => {
    try {
      return new Big(unitPriceEst || '0').mul(new Big(qtySum || '0')).toFixed()
    } catch {
      return '0'
    }
  }, [unitPriceEst, qtySum])

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['demand-request'] })

  const patch = async (body: Parameters<typeof api.updateDemandLine>[1]) => {
    try {
      await api.updateDemandLine(line.id, body)
      toast.success(t('updated'))
      invalidate()
      onDataChanged()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  /* Khi chọn vật tư: tự điền đơn giá ước (lastUnitPrice) + áp gợi ý số lượng. */
  const chooseSupply = async (id: string | null) => {
    setSupplyId(id)
    if (!id) return
    try {
      const res = await api.suggestDemandLine({
        supplyId: id,
        periodKind,
        departmentId,
      })
      const suggestion = res.suggestion as DemandLine['suggestion'] | undefined
      if (suggestion?.lastUnitPrice) setUnitPriceEst(suggestion.lastUnitPrice)
      if (res.suggestedQty != null && res.suggestedQty !== '0') {
        const cells = splitEvenly(res.suggestedQty, buckets)
        setQty(cells)
        await api.updateDemandLine(line.id, { supplyId: id, qtyByBucket: cells })
        invalidate()
      }
    } catch {
      /* gợi ý lỗi không chặn việc chọn vật tư — supplyId được lưu qua patch riêng */
      await api.updateDemandLine(line.id, { supplyId: id }).catch(() => undefined)
    }
  }

  const remove = async () => {
    try {
      await api.deleteDemandLine(line.id)
      toast.success(t('updated'))
      invalidate()
      onDataChanged()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-card">
        {editable ? (
          <div className="min-w-56 space-y-1">
            <TypeSelect
              value={itemType}
              onChange={(v) => {
                setItemType(v)
                void patch({ itemType: v })
              }}
            />
            {itemType === 'supply' || itemType === 'component' ? (
              <div className="min-w-56">
                <AsyncSelect
                  label={t('itemName')}
                  queryKey="supplies"
                  loadOptions={supplyOptions}
                  value={supplyId}
                  showLabel={false}
                  onChange={(v) => void chooseSupply(typeof v === 'string' ? v : null)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  aria-label={`${line.itemName || 'dòng'} tên`}
                  className="w-56"
                  value={itemName}
                  placeholder={t('itemNamePlaceholder')}
                  onChange={(e) => setItemName(e.target.value)}
                  onBlur={() => itemName !== line.itemName && void patch({ itemName })}
                />
                <Input
                  aria-label={`${line.itemName || 'dòng'} thông số`}
                  className="w-56"
                  value={spec}
                  placeholder={t('spec')}
                  onChange={(e) => setSpec(e.target.value)}
                  onBlur={() => spec !== (line.spec ?? '') && void patch({ spec })}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            {line.itemName}
            {line.spec && <p className="text-subtle text-[12px]">{line.spec}</p>}
          </div>
        )}
      </TableCell>
      <TableCell className="text-subtle text-[12.5px]">{line.unit ?? '—'}</TableCell>
      <TableCell>
        <div className="flex gap-1 overflow-x-auto">
          {qty.map((value, i) => (
            <BucketCell
              key={i}
              ariaLabel={`${line.itemName || 'dòng'} ${labels[i]}`}
              value={value}
              disabled={!editable}
              onCommit={(next) => {
                const nextQty = [...qty]
                nextQty[i] = next
                setQty(nextQty)
                void patch({ qtyByBucket: nextQty })
              }}
            />
          ))}
          {editable && (
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const total = window.prompt(t('splitEvenlyHint'), qtySum)
                  if (total) {
                    setQty(splitEvenly(total, buckets))
                    void patch({ qtyByBucket: splitEvenly(total, buckets) })
                  }
                }}
              >
                {t('splitEvenly')}
              </Button>
              <span className="text-center text-[11.5px] tabular-nums">Σ {qtySum}</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatQty(line.qtyRequested)}</TableCell>
      <TableCell className="text-right">
        <Input
          aria-label={`${line.itemName || 'dòng'} đơn giá ước`}
          className="w-28 text-right tabular-nums"
          inputMode="decimal"
          value={unitPriceEst}
          disabled={!editable}
          onChange={(e) => setUnitPriceEst(e.target.value)}
          onBlur={() => {
            if (unitPriceEst !== line.unitPriceEst) void patch({ unitPriceEst })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(amount)}</TableCell>
      <TableCell>
        <Input
          aria-label={`${line.itemName || 'dòng'} lý do`}
          className="w-40"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => reason !== (line.reason ?? '') && void patch({ reason })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={priority}
          disabled={!editable}
          onValueChange={(v) => {
            const next = v as DemandLine['priority']
            setPriority(next)
            void patch({ priority: next })
          }}
        >
          <SelectTrigger aria-label={`${line.itemName || 'dòng'} ưu tiên`} className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(demandPriorityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {line.suggestion && line.suggestedQty != null && (
          <SuggestChip
            line={line}
            onClick={() => {
              setQty(splitEvenly(String(line.suggestedQty), buckets))
              void patch({ qtyByBucket: splitEvenly(String(line.suggestedQty), buckets) })
            }}
          />
        )}
      </TableCell>
      {staffEditable && (
        <TableCell>
          <ApproveCells line={line} onCommitted={onDataChanged} />
        </TableCell>
      )}
      <TableCell>
        <Button size="icon-sm" variant="ghost" onClick={() => void remove()}>
          <Trash2 />
          <span className="sr-only">{t('deleteLineConfirm')}</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}

/** VT/ADM chỉnh SL duyệt + ghi chú từng dòng khi phiếu submitted+ (T2: accept {lines}). */
function ApproveCells({ line, onCommitted }: { line: DemandLine; onCommitted: () => void }) {
  const { t } = useTranslation('procurement')
  const [qtyApproved, setQtyApproved] = useState(
    trimZeroTail(line.qtyApproved ?? line.qtyRequested),
  )
  const [note, setNote] = useState(line.approverNote ?? '')
  const commit = async (next: { qtyApproved?: string; approverNote?: string }) => {
    try {
      await api.acceptDemandRequest(line.requestId, [
        {
          id: line.id,
          qtyApproved: next.qtyApproved ?? line.qtyApproved ?? line.qtyRequested,
          ...(next.approverNote != null ? { approverNote: next.approverNote } : {}),
        },
      ])
      toast.success(t('updated'))
      onCommitted()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <div className="flex gap-1">
      <Input
        aria-label={`${line.itemName || 'dòng'} SL duyệt`}
        className="h-7 w-20 text-right text-[12px] tabular-nums"
        inputMode="decimal"
        value={qtyApproved}
        onChange={(e) => setQtyApproved(e.target.value)}
        onBlur={() =>
          qtyApproved !== (line.qtyApproved ?? line.qtyRequested) && commit({ qtyApproved })
        }
      />
      <Input
        aria-label={`${line.itemName || 'dòng'} ghi chú duyệt`}
        className="h-7 w-32 text-[12px]"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (line.approverNote ?? '') && commit({ approverNote: note })}
      />
    </div>
  )
}

/** Dòng mới (chưa có trên backend): chỉ POST khi đã đủ dữ liệu hợp lệ. */
interface PendingLine {
  key: number
  itemType: DemandItemType
  supplyId: string | null
  itemName: string
  spec: string
  unitPriceEst: string
  reason: string
  priority: DemandLine['priority']
  qty: string[]
}

function PendingLineRow({
  pending,
  requestId,
  buckets,
  onChange,
  onCreated,
  onDiscard,
}: {
  pending: PendingLine
  requestId: string
  buckets: number
  onChange: (next: PendingLine) => void
  onCreated: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation('procurement')
  const labels = useMemo(() => bucketLabels(buckets), [buckets])
  const set = (patch: Partial<PendingLine>) => onChange({ ...pending, ...patch })
  const qtySum = sumQty(pending.qty)
  const amount = useMemo(() => {
    try {
      return new Big(pending.unitPriceEst || '0').mul(new Big(qtySum || '0')).toFixed()
    } catch {
      return '0'
    }
  }, [pending.unitPriceEst, qtySum])

  const create = async (body: Parameters<typeof api.addDemandLine>[1]) => {
    try {
      await api.addDemandLine(requestId, body)
      toast.success(t('added', { defaultValue: 'Đã thêm dòng' }))
      onCreated()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  /* supply/component: chọn vật tư là đủ điều kiện → tạo dòng (backend tự điền tên/ĐVT). */
  const chooseSupply = (id: string | null) => {
    set({ supplyId: id })
    if (!id) return
    void create({
      itemType: pending.itemType,
      supplyId: id,
      qtyByBucket: pending.qty,
      unitPriceEst: pending.unitPriceEst || '0',
      ...(pending.reason.trim() ? { reason: pending.reason.trim() } : {}),
      priority: pending.priority,
    })
  }

  /* equipment/service: cần tên + thông số (spec) — tạo khi cả hai đã nhập. */
  const tryCreateManual = () => {
    if (pending.itemType === 'supply' || pending.itemType === 'component') return
    if (!pending.itemName.trim() || !pending.spec.trim()) return
    void create({
      itemType: pending.itemType,
      itemName: pending.itemName.trim(),
      spec: pending.spec.trim(),
      qtyByBucket: pending.qty,
      unitPriceEst: pending.unitPriceEst || '0',
      ...(pending.reason.trim() ? { reason: pending.reason.trim() } : {}),
      priority: pending.priority,
    })
  }

  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-card">
        <div className="min-w-56 space-y-1">
          <TypeSelect
            value={pending.itemType}
            onChange={(v) => set({ itemType: v, supplyId: null })}
          />
          {pending.itemType === 'supply' || pending.itemType === 'component' ? (
            <AsyncSelect
              label={t('itemName')}
              queryKey="supplies"
              loadOptions={supplyOptions}
              value={pending.supplyId}
              showLabel={false}
              onChange={(v) => chooseSupply(typeof v === 'string' ? v : null)}
            />
          ) : (
            <div className="space-y-1">
              <Input
                aria-label={`${t('newLine', { defaultValue: 'dòng mới' })} tên`}
                className="w-56"
                value={pending.itemName}
                placeholder={t('itemNamePlaceholder')}
                onChange={(e) => set({ itemName: e.target.value })}
                onBlur={tryCreateManual}
              />
              <Input
                aria-label={`${t('newLine', { defaultValue: 'dòng mới' })} thông số`}
                className="w-56"
                value={pending.spec}
                placeholder={t('spec')}
                onChange={(e) => set({ spec: e.target.value })}
                onBlur={tryCreateManual}
              />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-subtle text-[12.5px]">—</TableCell>
      <TableCell>
        <div className="flex gap-1 overflow-x-auto">
          {pending.qty.map((value, i) => (
            <BucketCell
              key={i}
              ariaLabel={`${t('newLine', { defaultValue: 'dòng mới' })} ${labels[i]}`}
              value={value}
              onCommit={(next) => {
                const nextQty = [...pending.qty]
                nextQty[i] = next
                set({ qty: nextQty })
              }}
            />
          ))}
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const total = window.prompt(t('splitEvenlyHint'), qtySum)
                if (total) set({ qty: splitEvenly(total, buckets) })
              }}
            >
              {t('splitEvenly')}
            </Button>
            <span className="text-center text-[11.5px] tabular-nums">Σ {qtySum}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">—</TableCell>
      <TableCell className="text-right">
        <Input
          aria-label={`${t('newLine', { defaultValue: 'dòng mới' })} đơn giá ước`}
          className="w-28 text-right tabular-nums"
          inputMode="decimal"
          value={pending.unitPriceEst}
          onChange={(e) => set({ unitPriceEst: e.target.value })}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatVnd(amount)}</TableCell>
      <TableCell>
        <Input
          aria-label={`${t('newLine', { defaultValue: 'dòng mới' })} lý do`}
          className="w-40"
          value={pending.reason}
          onChange={(e) => set({ reason: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={pending.priority}
          onValueChange={(v) => set({ priority: v as DemandLine['priority'] })}
        >
          <SelectTrigger
            aria-label={`${t('newLine', { defaultValue: 'dòng mới' })} ưu tiên`}
            className="w-28"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(demandPriorityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-subtle text-[12px]">{t('pendingHint')}</TableCell>
      <TableCell>
        <Button size="icon-sm" variant="ghost" onClick={onDiscard}>
          <Trash2 />
          <span className="sr-only">{t('discardLine', { defaultValue: 'Bỏ dòng này' })}</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function ImportExcelDialog({
  open,
  onOpenChange,
  requestId,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  onImported: () => void
}) {
  const { t } = useTranslation('procurement')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ row?: number; message?: string }[] | null>(null)
  const [imported, setImported] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  // FormDialog yêu cầu form — import chỉ có file input, không dùng RHF fields.
  const form = useForm()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('importExcel')}
      form={form}
      submitLabel={t('importExcel')}
      submitting={busy}
      onSubmit={async () => {
        if (!file) {
          setImported(null)
          setErrors(null)
          return
        }
        setBusy(true)
        try {
          const result = await api.importDemandLines(requestId, file)
          setImported(result.created)
          setErrors(result.errors ?? [])
          if ((result.errors ?? []).length === 0) {
            toast.success(t('importOk', { n: result.created }))
            onImported()
            onOpenChange(false)
          }
        } catch (error) {
          toast.error(messageFor(error))
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="space-y-3 sm:col-span-full">
        <input
          aria-label={t('importExcel')}
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void api.downloadDemandTemplate()}
        >
          <Download /> {t('downloadTemplate')}
        </Button>
        {imported != null && errors && errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-destructive text-[13px] font-medium">
              {t('importErr')}: {t('importOk', { n: imported })}
            </p>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-subtle">
                  <th className="pr-2">Dòng</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="pr-2 tabular-nums">{row.row ?? '—'}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormDialog>
  )
}

export function Component() {
  const { t } = useTranslation('procurement')
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const isStaff = useCan(STAFF)
  const isHead = useCan(HEADS)
  const user = useAuthStore((s) => s.user)
  const { confirm, dialog } = useConfirm()
  const [importOpen, setImportOpen] = useState(false)
  const [pendings, setPendings] = useState<PendingLine[]>([])

  const detail = useQuery({
    queryKey: ['demand-request', id],
    queryFn: () => api.getDemandRequest(id),
    enabled: !!id,
  })
  // Phiếu chi tiết (T2) chỉ kèm kỳ rút gọn (code/id/name/status) — cần buckets của kỳ
  // cho ô SL theo tháng nên fetch kỳ thật.
  const periodId = detail.data?.periodId
  const period = useQuery({
    queryKey: ['demand-period', periodId],
    queryFn: () => api.getPeriod(periodId!),
    enabled: !!periodId,
  })

  if (detail.isPending) return <DetailSkeleton label={t('loadingRequest')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data as DemandRequest
  const per = period.data as DemandPeriod | undefined
  const buckets = per?.buckets ?? 12
  const lines = row.lines ?? []

  const ownDept = !!user?.departmentId && user.departmentId === row.departmentId
  const canEditLines = ownDept && (row.status === 'draft' || row.status === 'returned')
  const canApproveLines = isStaff && ['submitted', 'dept_approved', 'accepted'].includes(row.status)
  const total = lines.reduce((sum, line) => sum.plus(new Big(line.amountEst || '0')), new Big(0))

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['demand-request', id] })
    void qc.invalidateQueries({ queryKey: ['demand-my'] })
  }
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  const addLine = () => {
    // Dòng mới là bản nháp cục bộ — chỉ POST lên backend khi chọn vật tư
    // (supply/component) hoặc nhập đủ tên + thông số (equipment/service),
    // vì API bắt buộc dữ liệu này (DEMAND_LINE_INVALID).
    setPendings((rows) => [
      ...rows,
      {
        key: Date.now() + rows.length,
        itemType: 'supply',
        supplyId: null,
        itemName: '',
        spec: '',
        unitPriceEst: '0',
        reason: '',
        priority: 'normal',
        qty: Array.from({ length: buckets }, () => '0'),
      },
    ])
  }
  const suggestAll = async () => {
    try {
      await api.suggestAllLines(row.id)
      toast.success(t('suggestApplied'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  const editableHeader = canEditLines
  const showStaffCells = canApproveLines

  return (
    <>
      {dialog}
      <PageHeader
        eyebrow={t('requestDetail')}
        title={row.department?.name ?? row.departmentId ?? '—'}
        badge={<StatusBadge value={row.status} map={demandRequestStatusMap} />}
        meta={
          <>
            {row.period && (
              <PageMeta icon={<Link2 size={14} />}>
                <Link
                  className="font-mono hover:underline"
                  to={`/procurement/demand/periods/${row.periodId}`}
                >
                  {row.period.code ?? '—'}
                </Link>
              </PageMeta>
            )}
            {per?.submitDeadline && (
              <PageMeta icon={<CalendarClock size={14} />}>
                {t('deadline')}: {formatDate(per.submitDeadline)}
              </PageMeta>
            )}
            <PageMeta icon={<Coins size={14} />}>
              {t('totalMoney')}: {formatVnd(total.toFixed())}
            </PageMeta>
          </>
        }
        actions={
          <ActionMenu
            items={[
              canEditLines && {
                key: 'submit',
                label: t('submit'),
                variant: 'primary' as const,
                onClick: () => void run(t('submitConfirm'), () => api.submitDemandRequest(row.id)),
              },
              (isHead || isStaff) &&
                row.status === 'submitted' && {
                  key: 'deptApprove',
                  label: t('deptApprove'),
                  variant: 'primary' as const,
                  onClick: () =>
                    void run(t('deptApproveConfirm'), () => api.deptApproveDemandRequest(row.id)),
                },
              (isHead || isStaff) &&
                ['submitted', 'dept_approved'].includes(row.status) && {
                  key: 'return',
                  label: t('return'),
                  variant: 'destructive' as const,
                  onClick: async () => {
                    const reason = await confirm({
                      title: t('returnConfirm'),
                      requireReason: true,
                      destructive: true,
                    })
                    if (reason === false) return
                    try {
                      await api.returnDemandRequest(row.id, reason)
                      toast.success(t('updated'))
                      invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  },
                },
              isStaff &&
                row.status === 'dept_approved' && {
                  key: 'accept',
                  label: t('accept'),
                  variant: 'primary' as const,
                  onClick: () =>
                    void run(t('acceptConfirm'), () => api.acceptDemandRequest(row.id)),
                },
            ]}
          />
        }
      />
      {row.returnReason && (
        <Alert>
          <AlertTitle>{t('returnReason')}</AlertTitle>
          <AlertDescription>{row.returnReason}</AlertDescription>
        </Alert>
      )}
      <SectionCard
        title={t('linesTab')}
        description={per?.name}
        flush
        footer={
          <div className="text-muted-foreground flex justify-end gap-3 text-sm">
            {t('totalMoney')}:<strong className="tabular-nums">{formatVnd(total.toFixed())}</strong>
          </div>
        }
        actions={
          canEditLines ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void addLine()}>
                <Plus /> {t('addLine')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload /> {t('importExcel')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void suggestAll()}>
                <Sparkles /> {t('suggestAll')}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">
                  {t('itemType')} / {t('supplyName')}
                </TableHead>
                <TableHead>{t('unit')}</TableHead>
                <TableHead>{t('qtyByBucket')}</TableHead>
                <TableHead className="text-right">{t('qty')}</TableHead>
                <TableHead className="text-right">{t('unitPriceEst')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead>{t('reason')}</TableHead>
                <TableHead>{t('priority')}</TableHead>
                <TableHead>{t('suggest')}</TableHead>
                {showStaffCells && (
                  <TableHead>
                    {t('qtyApproved')} / {t('approverNote')}
                  </TableHead>
                )}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  buckets={buckets}
                  editable={editableHeader}
                  staffEditable={showStaffCells}
                  periodKind={per?.kind ?? 'annual'}
                  departmentId={row.departmentId ?? ''}
                  onDataChanged={invalidate}
                />
              ))}
              {pendings.map((pending) => (
                <PendingLineRow
                  key={pending.key}
                  pending={pending}
                  requestId={row.id}
                  buckets={buckets}
                  onChange={(next) =>
                    setPendings((rows) => rows.map((p) => (p.key === next.key ? next : p)))
                  }
                  onCreated={() => {
                    setPendings((rows) => rows.filter((p) => p.key !== pending.key))
                    invalidate()
                  }}
                  onDiscard={() => setPendings((rows) => rows.filter((p) => p.key !== pending.key))}
                />
              ))}
              {lines.length === 0 && pendings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground text-center text-sm">
                    {t('noLines', { defaultValue: 'Chưa có dòng nào — bấm "Thêm dòng"' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        requestId={row.id}
        onImported={invalidate}
      />
    </>
  )
}
