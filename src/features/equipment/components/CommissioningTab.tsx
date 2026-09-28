import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  PackageCheck,
  PlayCircle,
  TriangleAlert,
  User,
  Wrench,
} from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format/date'
import { messageFor } from '@/api/errors'
import * as api from '../api'
import { equipmentKeys } from '../hooks'
import {
  COMMISSIONING_RESULTS,
  type Commissioning,
  type CommissioningInput,
  type CommissioningResult,
} from '../types'

type Step = {
  dateKey: keyof Pick<
    Commissioning,
    'receivedAt' | 'installedAt' | 'testRunAt' | 'acceptedAt' | 'releasedAt'
  >
  byKey: keyof Pick<
    Commissioning,
    'receivedBy' | 'installedBy' | 'testRunBy' | 'acceptedBy' | 'releasedBy'
  >
  labelKey: string
  hintKey: string
  icon: typeof PackageCheck
}

/** Năm mốc theo đúng thứ tự bàn giao. */
const STEPS: Step[] = [
  {
    dateKey: 'receivedAt',
    byKey: 'receivedBy',
    labelKey: 'received',
    hintKey: 'receivedHint',
    icon: PackageCheck,
  },
  {
    dateKey: 'installedAt',
    byKey: 'installedBy',
    labelKey: 'installed',
    hintKey: 'installedHint',
    icon: Wrench,
  },
  {
    dateKey: 'testRunAt',
    byKey: 'testRunBy',
    labelKey: 'testRun',
    hintKey: 'testRunHint',
    icon: PlayCircle,
  },
  {
    dateKey: 'acceptedAt',
    byKey: 'acceptedBy',
    labelKey: 'accepted',
    hintKey: 'acceptedHint',
    icon: ClipboardCheck,
  },
  {
    dateKey: 'releasedAt',
    byKey: 'releasedBy',
    labelKey: 'released',
    hintKey: 'releasedHint',
    icon: BadgeCheck,
  },
]

const todayIso = () => new Date().toISOString().slice(0, 10)

/**
 * C2 (IMM-03) — khối "Nghiệm thu đưa vào sử dụng": năm mốc dạng các bước, mỗi
 * mốc có ngày, người thực hiện và nút đánh dấu hoàn thành; kèm biên bản và kết quả.
 *
 * Khi chưa có mốc `releasedAt`, khối nói rõ lý do thiết bị chưa chuyển sang
 * "Hoạt động" (đang chờ nghiệm thu).
 */
export function CommissioningTab({
  id,
  canWrite,
  canPickPerformer,
  userNames,
  currentUserId,
  currentUserName,
}: {
  id: string
  canWrite: boolean
  canPickPerformer: boolean
  userNames: Map<string, string>
  currentUserId?: string
  currentUserName?: string
}) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: equipmentKeys.commissioning(id),
    queryFn: () => api.getCommissioning(id),
  })
  const row = query.data ?? null
  const [result, setResult] = useState<CommissioningResult | ''>('')
  const [note, setNote] = useState('')
  const [documentFileId, setDocumentFileId] = useState<string | null>(null)

  useEffect(() => {
    setResult(row?.result ?? '')
    setNote(row?.note ?? '')
    setDocumentFileId(row?.documentFileId ?? null)
  }, [row])

  const save = useMutation({
    mutationFn: (body: CommissioningInput) => api.putCommissioning(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
      toast.success(t('commissioning.saved'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const nextStep = STEPS.find((step) => !row?.[step.dateKey])
  const released = Boolean(row?.releasedAt)

  return (
    <SectionCard title={t('commissioning.title')} description={t('commissioning.description')}>
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          released
            ? 'border-success/40 bg-success-bg text-success-fg'
            : 'border-warning/40 bg-warning-bg text-warning-fg',
        )}
        role="status"
      >
        {released ? (
          <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <div>
          <p>{released ? t('commissioning.released') : t('commissioning.notReleased')}</p>
          {!released && nextStep && (
            <p className="mt-0.5">
              {t('commissioning.nextStep', { step: t(`commissioning.steps.${nextStep.labelKey}`) })}
            </p>
          )}
        </div>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground mt-4 text-sm" role="status">
          {t('commissioning.loading')}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {STEPS.map((step, index) => {
            const value = row?.[step.dateKey] ?? null
            const byUserId = row?.[step.byKey] ?? null
            const previousDone = index === 0 || Boolean(row?.[STEPS[index - 1]!.dateKey])
            const done = Boolean(value)
            const Icon = step.icon
            return (
              <StepRow
                key={step.dateKey}
                label={t(`commissioning.steps.${step.labelKey}`)}
                hint={t(`commissioning.${step.hintKey}`)}
                icon={<Icon className="size-4" aria-hidden />}
                value={value}
                performer={
                  byUserId
                    ? byUserId === currentUserId
                      ? (currentUserName ?? userNames.get(byUserId) ?? byUserId.slice(0, 8))
                      : (userNames.get(byUserId) ?? byUserId.slice(0, 8))
                    : null
                }
                done={done}
                enabled={canWrite && previousDone}
                saving={save.isPending}
                canPickPerformer={canPickPerformer}
                currentUserId={currentUserId}
                onSave={(date, by) =>
                  save.mutate({
                    [step.dateKey]: date,
                    [step.byKey]: by,
                  } as CommissioningInput)
                }
              />
            )
          })}
        </ol>
      )}

      <div className="border-divider mt-5 grid gap-4 border-t pt-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="commissioning-result">
            {t('commissioning.result')}
          </label>
          <Select
            value={result || 'none'}
            onValueChange={(value) =>
              setResult(value === 'none' ? '' : (value as CommissioningResult))
            }
            disabled={!canWrite}
          >
            <SelectTrigger
              id="commissioning-result"
              className="border-border bg-card h-11 w-full"
              aria-label={t('commissioning.result')}
            >
              <SelectValue placeholder={t('commissioning.resultPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('commissioning.resultPlaceholder')}</SelectItem>
              {COMMISSIONING_RESULTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`commissioning.results.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="commissioning-note">
            {t('commissioning.note')}
          </label>
          <textarea
            id="commissioning-note"
            className="border-border bg-card min-h-11 w-full rounded-md border px-3 py-2 text-sm"
            value={note}
            disabled={!canWrite}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <FileField
            label={t('commissioning.document')}
            value={documentFileId}
            onChange={setDocumentFileId}
            disabled={!canWrite}
          />
        </div>
        {canWrite && (
          <div className="md:col-span-2">
            <Button
              type="button"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  result: result || null,
                  note: note || null,
                  documentFileId,
                })
              }
            >
              {t('commissioning.save')}
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function StepRow({
  label,
  hint,
  icon,
  value,
  performer,
  done,
  enabled,
  saving,
  canPickPerformer,
  currentUserId,
  onSave,
}: {
  label: string
  hint: string
  icon: ReactNode
  value: string | null
  performer: string | null
  done: boolean
  enabled: boolean
  saving: boolean
  canPickPerformer: boolean
  currentUserId?: string
  onSave: (date: string, by: string | null) => void
}) {
  const { t } = useTranslation('equipment')
  const [date, setDate] = useState(value ?? todayIso())
  const [by, setBy] = useState<string | null>(null)

  useEffect(() => {
    setDate(value ?? todayIso())
    setBy(null)
  }, [value])

  return (
    <li className={cn('bg-card border-border rounded-lg border p-4', done && 'border-success/40')}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            done ? 'bg-success-bg text-success-fg' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {done ? <Check className="size-4" /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{label}</p>
          <p className="text-muted-foreground text-[12px]">{hint}</p>
          {done ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="text-muted-foreground size-3.5" aria-hidden />
                {formatDate(value)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="text-muted-foreground size-3.5" aria-hidden />
                {performer ?? '—'}
              </span>
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DatePicker
                value={date}
                onChange={(next) => setDate(next ?? todayIso())}
                disabled={!enabled}
                ariaLabel={t('commissioning.dateFor', { step: label })}
                className="w-40"
              />
              {canPickPerformer && (
                <AsyncSelect
                  label={t('commissioning.performer')}
                  queryKey="commissioning-users"
                  loadOptions={api.userOptions}
                  value={by ?? currentUserId ?? null}
                  onChange={(next) => setBy(Array.isArray(next) ? null : next)}
                  disabled={!enabled}
                  showLabel={false}
                  placeholder={t('commissioning.performer')}
                  className="w-56"
                />
              )}
              <Button
                type="button"
                size="sm"
                disabled={!enabled || saving}
                onClick={() => onSave(date, by ?? currentUserId ?? null)}
              >
                {t('commissioning.markDone')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
