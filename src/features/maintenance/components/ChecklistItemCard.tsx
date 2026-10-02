import { Check, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileField } from '@/components/form/file-field'
import { cn } from '@/lib/utils'
import type { ResultRow } from '../types'
import { formatResult, type EditableChecklistItem } from '../checklist'

/**
 * Một dòng mục kiểm tra: phần định nghĩa (nhãn/kiểu/ngưỡng/tuỳ chọn) + phần kết quả.
 * Ở công việc đã hoàn thành chỉ đọc. Dòng mới được thêm từ nút "Thêm mục" ở khối cha.
 */
export function ChecklistItemCard({
  item,
  index,
  result,
  missing,
  canEdit,
  canEnterResults,
  onPatchItem,
  onRemove,
  onPatchResult,
}: {
  item: EditableChecklistItem
  index: number
  result: ResultRow
  missing: boolean
  canEdit: boolean
  canEnterResults: boolean
  onPatchItem: (patch: Partial<EditableChecklistItem>) => void
  onRemove: () => void
  onPatchResult: (patch: Partial<ResultRow>) => void
}) {
  const { t } = useTranslation('maintenance')
  const measure = typeof result.value === 'number' ? result.value : Number(result.value)
  const inRange =
    item.type === 'measure' &&
    Number.isFinite(measure) &&
    (item.min === '' || measure >= Number(item.min)) &&
    (item.max === '' || measure <= Number(item.max))

  return (
    <div
      className={cn(
        'border-divider space-y-3 rounded-md border p-4 transition-colors',
        missing && 'border-destructive bg-destructive-bg/40',
        result.pass === true && 'border-success/40 bg-success-bg/30',
        result.pass === false && 'border-destructive/40 bg-destructive-bg/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-[13px] leading-5 font-medium">
          {t('item')} {index + 1}
          {item.optional ? '' : <span className="text-destructive"> *</span>}
        </p>
        <div className="flex items-center gap-1">
          {result.pass === true && <Check className="text-success size-4 shrink-0" aria-hidden />}
          {result.pass === false && <X className="text-destructive size-4 shrink-0" aria-hidden />}
          {canEdit && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('removeItem')}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {canEdit ? (
        <>
          <Input
            aria-label={t('itemLabel')}
            placeholder={t('itemLabel')}
            value={item.label}
            onChange={(event) => onPatchItem({ label: event.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={item.type}
              onValueChange={(value) =>
                onPatchItem({ type: value as EditableChecklistItem['type'] })
              }
            >
              <SelectTrigger aria-label={t('itemType')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">{t('optionCheck')}</SelectItem>
                <SelectItem value="measure">{t('optionMeasure')}</SelectItem>
                <SelectItem value="text">{t('optionText')}</SelectItem>
              </SelectContent>
            </Select>
            {item.type === 'measure' && (
              <Input
                aria-label={t('unit')}
                placeholder={t('unit')}
                value={item.unit}
                onChange={(event) => onPatchItem({ unit: event.target.value })}
              />
            )}
          </div>
          {item.type === 'measure' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Min"
                type="number"
                placeholder="Min"
                value={item.min}
                onChange={(event) => onPatchItem({ min: event.target.value })}
              />
              <Input
                aria-label="Max"
                type="number"
                placeholder="Max"
                value={item.max}
                onChange={(event) => onPatchItem({ max: event.target.value })}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-[13px] leading-5">
            <Checkbox
              checked={item.optional}
              onCheckedChange={(checked) => onPatchItem({ optional: checked === true })}
            />
            {t('optional')}
          </label>
        </>
      ) : (
        <div className="space-y-1">
          <p className="text-[14px] leading-5 font-semibold">
            {item.label}
            {item.optional ? (
              <span className="text-muted-foreground ml-1 text-[12px] font-normal">
                ({t('optional')})
              </span>
            ) : null}
          </p>
          {item.type === 'measure' && (item.unit || item.min || item.max) && (
            <p className="text-muted-foreground text-[12.5px]">
              {[
                item.unit,
                item.min !== '' || item.max !== '' ? `${item.min || '—'}–${item.max || '—'}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      {canEnterResults ? (
        <>
          {item.type === 'check' && (
            <div className="flex gap-3">
              <Button
                type="button"
                size="sm"
                variant={result.pass === true ? 'default' : 'outline'}
                onClick={() => onPatchResult({ pass: true, value: true })}
              >
                {t('pass')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={result.pass === false ? 'default' : 'outline'}
                onClick={() => onPatchResult({ pass: false, value: false })}
              >
                {t('fail')}
              </Button>
            </div>
          )}
          {item.type === 'measure' && (
            <div>
              <Input
                aria-label={item.label}
                type="number"
                placeholder={`${item.unit}${item.min !== '' || item.max !== '' ? ` (${item.min || '—'}–${item.max || '—'})` : ''}`}
                value={result.value == null ? '' : String(result.value)}
                onChange={(event) => {
                  const value = event.target.value === '' ? null : Number(event.target.value)
                  const pass =
                    value == null
                      ? undefined
                      : (item.min === '' || value >= Number(item.min)) &&
                        (item.max === '' || value <= Number(item.max))
                  onPatchResult({ value, pass })
                }}
              />
              {inRange && <span className="sr-only">{t('inRange')}</span>}
            </div>
          )}
          {item.type === 'text' && (
            <Textarea
              aria-label={item.label}
              value={typeof result.value === 'string' ? result.value : ''}
              onChange={(event) =>
                onPatchResult({ value: event.target.value, pass: !!event.target.value })
              }
            />
          )}
          <Input
            placeholder={t('notes')}
            value={result.note ?? ''}
            onChange={(event) => onPatchResult({ note: event.target.value })}
          />
          <FileField
            label={t('attachmentPhoto')}
            value={result.photoFileId ?? null}
            onChange={(photoFileId) => onPatchResult({ photoFileId: photoFileId ?? undefined })}
          />
        </>
      ) : (result.value !== undefined && result.value !== null) || result.note ? (
        <dl className="space-y-1 text-[13px] leading-5">
          {result.value !== undefined && result.value !== null && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t('result')}:</dt>
              <dd className="font-medium">{formatResult(item, result)}</dd>
            </div>
          )}
          {result.note && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t('notes')}:</dt>
              <dd>{result.note}</dd>
            </div>
          )}
        </dl>
      ) : null}
    </div>
  )
}
