import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ErrorState } from '@/components/page/ErrorState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { isApiError, messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'
// Nạp bản dịch của tính năng (namespace `doc-templates` + nhãn menu).
import '../i18n'
import {
  docTemplateKeys,
  getDocTemplate,
  listDocTemplates,
  previewDocTemplate,
  saveDocTemplate,
  type Block,
  type DocTemplateBody,
  type DocTemplateSource,
  type PageSetup,
  type SignatureBoxSpec,
} from '../api/doc-templates'

/**
 * Tên tiếng Việt cho 7 loại chứng từ. Danh sách API trả `name = null` khi đang dùng
 * mẫu gốc (tên thật chỉ có ở mẫu viện tự lưu), nên màn phải tự có nhãn hiển thị.
 */
const DOC_TYPE_LABELS: Record<string, string> = {
  'repair.completion': 'Biên bản sửa chữa',
  'maintenance.task': 'Biên bản bảo dưỡng',
  'calibration.result': 'Biên bản kiểm định',
  'stock.receipt': 'Phiếu nhập kho',
  'stock.issue': 'Phiếu xuất kho',
  'stocktake.result': 'Biên bản kiểm kê',
  'demand.proposal': 'Phiếu đề nghị cấp vật tư',
}

const docTypeLabel = (docType: string) => DOC_TYPE_LABELS[docType] ?? docType

/** Khối trong trình soạn: giữ `id` ổn định để React không dựng lại ô nhập khi đổi thứ tự. */
type EditorBlock = { id: string; enabled: boolean; block: Block }

type SaveErrors = { blocks: Map<number, string>; general: string | null }

const EMPTY_ERRORS: SaveErrors = { blocks: new Map(), general: null }

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/**
 * Đọc lỗi 400 của API thành lỗi theo khối.
 *
 * API trả `details: [{ path: 'blocks.3.type', message }]`. Chỉ số trong `path` tính trên
 * mảng khối ĐÃ GỬI (bỏ khối bị tắt), nên phải chiếu ngược qua `enabledIndexes` để gắn lỗi
 * đúng khối đang hiện trên màn — nếu không, tắt một khối sẽ làm mọi lỗi lệch một nấc.
 */
function parseSaveErrors(error: unknown, enabledIndexes: number[]): SaveErrors {
  if (!error) return EMPTY_ERRORS
  const blocks = new Map<number, string>()
  let general: string | null = null
  const details = isApiError(error) ? error.details : undefined
  if (Array.isArray(details)) {
    for (const raw of details) {
      if (!raw || typeof raw !== 'object' || !('path' in raw)) continue
      const item = raw as { path?: unknown; message?: unknown }
      const path = typeof item.path === 'string' ? item.path : ''
      const message = typeof item.message === 'string' ? item.message : path
      const match = /^blocks\.(\d+)/.exec(path)
      if (match) {
        const wrapperIndex = enabledIndexes[Number(match[1])]
        if (wrapperIndex === undefined) general = `${path}: ${message}`
        else blocks.set(wrapperIndex, message)
      } else {
        general = `${path || 'mẫu'}: ${message}`
      }
    }
  }
  if (blocks.size === 0 && !general) general = messageFor(error)
  return { blocks, general }
}

export function Component() {
  const { t } = useTranslation('doc-templates')
  const queryClient = useQueryClient()
  const canWrite = useCan(ADM)

  const listQuery = useQuery({ queryKey: docTemplateKeys.all, queryFn: listDocTemplates })
  const [selected, setSelected] = useState<string | null>(null)
  // Chưa chọn thì mở sẵn loại đầu tiên để màn không trống chờ người dùng bấm.
  const activeDocType = selected ?? listQuery.data?.items[0]?.docType ?? null

  const detailQuery = useQuery({
    queryKey: docTemplateKeys.detail(activeDocType ?? 'none'),
    queryFn: () => getDocTemplate(activeDocType ?? ''),
    enabled: !!activeDocType,
  })

  const [pageSetup, setPageSetup] = useState<PageSetup | null>(null)
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [source, setSource] = useState<DocTemplateSource>('builtin')
  const [previewing, setPreviewing] = useState(false)

  // Nạp bản mẫu mới nhất vào trình soạn mỗi khi API trả mẫu (đổi loại hoặc sau khi lưu).
  useEffect(() => {
    const data = detailQuery.data
    if (!data) return
    setPageSetup(data.body.pageSetup)
    setBlocks(data.body.blocks.map((block, index) => ({ id: `b${index}`, enabled: true, block })))
    setSource(data.source)
  }, [detailQuery.data])

  // Mảng gửi lên API chỉ gồm khối đang bật.
  const body = useMemo<DocTemplateBody | null>(
    () =>
      pageSetup
        ? { pageSetup, blocks: blocks.filter((item) => item.enabled).map((item) => item.block) }
        : null,
    [pageSetup, blocks],
  )
  const enabledIndexes = useMemo(
    () => blocks.flatMap((item, index) => (item.enabled ? [index] : [])),
    [blocks],
  )

  const saveMutation = useMutation({
    mutationFn: () => saveDocTemplate(activeDocType ?? '', body as DocTemplateBody),
    onSuccess: (saved) => {
      setSource(saved.source)
      toast.success(t('saved'))
      // Tải lại cả danh sách lẫn chi tiết để nhãn "Bản riêng" và ruột mẫu khớp server.
      void queryClient.invalidateQueries({ queryKey: docTemplateKeys.all })
    },
  })

  const saveErrors = useMemo(
    () => parseSaveErrors(saveMutation.error, enabledIndexes),
    [saveMutation.error, enabledIndexes],
  )

  const selectDocType = (docType: string) => {
    setSelected(docType)
    saveMutation.reset()
  }

  const updateBlockAt = (index: number, next: Block) =>
    setBlocks((prev) => prev.map((item, i) => (i === index ? { ...item, block: next } : item)))

  const moveBlock = (index: number, direction: -1 | 1) =>
    setBlocks((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const current = next[index]
      const other = next[target]
      if (!current || !other) return prev
      next[index] = other
      next[target] = current
      return next
    })

  const onPreview = async () => {
    if (!activeDocType || !body) return
    setPreviewing(true)
    try {
      const blob = await previewDocTemplate(activeDocType, body)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      // Thu hồi sau khi tab mới kịp tải; thu hồi ngay sẽ làm tab trắng.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('hint')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onPreview()}
              disabled={!body || previewing}
            >
              {previewing ? <Loader2 className="animate-spin" aria-hidden /> : <Eye aria-hidden />}
              {t('preview')}
            </Button>
            {canWrite && (
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={!body || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Save aria-hidden />
                )}
                {t('save')}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SectionCard title={t('docTypes')} flush className="lg:sticky lg:top-[84px] lg:self-start">
          {listQuery.isPending ? (
            <p className="text-muted-foreground px-4 py-5 text-sm">{t('common:page.loading')}</p>
          ) : listQuery.isError ? (
            <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          ) : (
            <ul className="divide-divider divide-y">
              {(listQuery.data?.items ?? []).map((item) => {
                const active = item.docType === activeDocType
                return (
                  <li key={item.docType}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => selectDocType(item.docType)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                        active ? 'bg-primary-soft text-primary font-medium' : 'hover:bg-muted',
                      )}
                    >
                      <span className="truncate">{docTypeLabel(item.docType)}</span>
                      {item.source === 'tenant' && <Badge variant="info">{t('tenantShort')}</Badge>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t('layout')}
          description={source === 'tenant' ? t('sourceTenant') : t('sourceBuiltin')}
          actions={
            source === 'builtin' && canWrite ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={!body || saveMutation.isPending}
              >
                <Plus aria-hidden />
                {t('createOwn')}
              </Button>
            ) : null
          }
        >
          {detailQuery.isPending ? (
            <p className="text-muted-foreground py-6 text-sm">{t('common:page.loading')}</p>
          ) : detailQuery.isError ? (
            <ErrorState error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
          ) : (
            <div className="space-y-4">
              {pageSetup && <PageSetupFields value={pageSetup} onChange={setPageSetup} />}

              {saveErrors.general && (
                <Alert variant="destructive">
                  <AlertTitle>{t('saveError')}</AlertTitle>
                  <AlertDescription>{saveErrors.general}</AlertDescription>
                </Alert>
              )}

              {blocks.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('emptyBlocks')}</p>
              ) : (
                <div className="space-y-3">
                  {blocks.map((item, index) => (
                    <BlockCard
                      key={item.id}
                      index={index}
                      total={blocks.length}
                      item={item}
                      error={saveErrors.blocks.get(index)}
                      onChange={(next) => updateBlockAt(index, next)}
                      onMove={(direction) => moveBlock(index, direction)}
                      onToggle={(enabled) =>
                        setBlocks((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, enabled } : row)),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

/** Nhãn trên ô, ô nhập nền trắng có viền theo §Chuẩn thành phần (chốt 2026-09-27). */
function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-foreground block text-[13px] leading-5">{label}</span>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
      />
    </Field>
  )
}

function PageSetupFields({
  value,
  onChange,
}: {
  value: PageSetup
  onChange: (next: PageSetup) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <section className="bg-muted/40 space-y-3 rounded-md border p-3">
      <h3 className="text-[15px] font-semibold">{t('pageSetup')}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('size')}>
          <Select
            value={value.size}
            onValueChange={(next) => onChange({ ...value, size: next as PageSetup['size'] })}
          >
            <SelectTrigger className="w-full" aria-label={t('size')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A5">A5</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('orientation')}>
          <Select
            value={value.orientation}
            onValueChange={(next) =>
              onChange({ ...value, orientation: next as PageSetup['orientation'] })
            }
          >
            <SelectTrigger className="w-full" aria-label={t('orientation')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">{t('portrait')}</SelectItem>
              <SelectItem value="landscape">{t('landscape')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <NumberField
          label={t('baseFontSize')}
          value={value.baseFontSize}
          onChange={(baseFontSize) => onChange({ ...value, baseFontSize })}
        />
      </div>
    </section>
  )
}

function BlockCard({
  index,
  total,
  item,
  error,
  onChange,
  onMove,
  onToggle,
}: {
  index: number
  total: number
  item: EditorBlock
  error?: string
  onChange: (next: Block) => void
  onMove: (direction: -1 | 1) => void
  onToggle: (enabled: boolean) => void
}) {
  const { t } = useTranslation('doc-templates')
  const { block, enabled } = item
  return (
    <div
      className={cn(
        'bg-card rounded-md border p-3',
        !enabled && 'opacity-60',
        error && 'border-destructive',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant={enabled ? 'neutral' : 'outline'}>
            {t(`block${capitalize(block.type)}`)}
          </Badge>
          <span className="text-muted-foreground text-xs tabular-nums">#{index + 1}</span>
          {!enabled && (
            <span className="text-muted-foreground truncate text-xs">{t('blockDisabled')}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            aria-label={t('blockEnable', { n: index + 1 })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t('blockUp', { n: index + 1 })}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label={t('blockDown', { n: index + 1 })}
          >
            <ArrowDown aria-hidden />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <BlockFields block={block} onChange={onChange} />
      </div>

      {error && (
        <p className="text-destructive-fg mt-2 text-xs">
          {t('invalidBlock', { n: index + 1 })}: {error}
        </p>
      )}
    </div>
  )
}

function BlockFields({ block, onChange }: { block: Block; onChange: (next: Block) => void }) {
  switch (block.type) {
    case 'header':
      return <HeaderFields block={block} onChange={onChange} />
    case 'title':
      return <TitleFields block={block} onChange={onChange} />
    case 'fields':
      return <FieldsFields block={block} onChange={onChange} />
    case 'table':
      return <TableFields block={block} onChange={onChange} />
    case 'text':
      return <TextFields block={block} onChange={onChange} />
    case 'signatures':
      return <SignatureFields block={block} onChange={onChange} />
    case 'spacer':
      return <SpacerFields block={block} onChange={onChange} />
    case 'footer':
      return <FooterFields block={block} onChange={onChange} />
    case 'divider':
      return null
  }
}

function HeaderFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'header' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('logo')}>
        <Select
          value={block.logo}
          onValueChange={(next) =>
            onChange({ ...block, logo: next as Extract<Block, { type: 'header' }>['logo'] })
          }
        >
          <SelectTrigger className="w-full" aria-label={t('logo')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">{t('logoLeft')}</SelectItem>
            <SelectItem value="center">{t('logoCenter')}</SelectItem>
            <SelectItem value="right">{t('logoRight')}</SelectItem>
            <SelectItem value="none">{t('logoNone')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t('lines')} className="sm:col-span-2">
        <Textarea
          aria-label={t('lines')}
          rows={4}
          value={block.lines.join('\n')}
          onChange={(event) => onChange({ ...block, lines: event.target.value.split('\n') })}
        />
      </Field>
    </div>
  )
}

function TitleFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'title' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('text')} className="sm:col-span-2">
        <Input
          aria-label={t('text')}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </Field>
      <Field label={t('align')}>
        <Select
          value={block.align}
          onValueChange={(next) =>
            onChange({ ...block, align: next as Extract<Block, { type: 'title' }>['align'] })
          }
        >
          <SelectTrigger className="w-full" aria-label={t('align')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">{t('alignLeft')}</SelectItem>
            <SelectItem value="center">{t('alignCenter')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

function FieldsFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'fields' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  const setItem = (index: number, patch: Partial<{ label: string; value: string }>) =>
    onChange({
      ...block,
      items: block.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    })
  return (
    <div className="space-y-3">
      <Field label={t('columns')} className="max-w-40">
        <Select
          value={String(block.columns)}
          onValueChange={(next) =>
            onChange({
              ...block,
              columns: Number(next) as Extract<Block, { type: 'fields' }>['columns'],
            })
          }
        >
          <SelectTrigger className="w-full" aria-label={t('columns')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="space-y-2">
        <span className="text-foreground block text-[13px] leading-5">{t('items')}</span>
        {block.items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label={`${t('label')} ${index + 1}`}
              placeholder={t('label')}
              value={item.label}
              onChange={(event) => setItem(index, { label: event.target.value })}
            />
            <Input
              aria-label={`${t('value')} ${index + 1}`}
              placeholder={t('value')}
              value={item.value}
              onChange={(event) => setItem(index, { value: event.target.value })}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...block, items: [...block.items, { label: '', value: '' }] })}
        >
          <Plus aria-hidden />
          {t('addItem')}
        </Button>
      </div>
    </div>
  )
}

function TableFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'table' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <span className="text-foreground block text-[13px] leading-5">{t('tableColumns')}</span>
        {block.columns.map((column, index) => (
          <div key={column.key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              aria-label={`${t('label')} ${column.key}`}
              value={column.label}
              onChange={(event) =>
                onChange({
                  ...block,
                  columns: block.columns.map((col, i) =>
                    i === index ? { ...col, label: event.target.value } : col,
                  ),
                })
              }
            />
            <span className="text-muted-foreground self-center text-xs">{column.key}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-[13px]">
          <Switch
            checked={block.showTotals ?? false}
            onCheckedChange={(checked) => onChange({ ...block, showTotals: checked })}
          />
          {t('showTotals')}
        </label>
        {(block.showTotals ?? false) && (
          <Field label={t('totalsLabel')} className="max-w-60 flex-1">
            <Input
              aria-label={t('totalsLabel')}
              value={block.totalsLabel ?? ''}
              onChange={(event) => onChange({ ...block, totalsLabel: event.target.value })}
            />
          </Field>
        )}
      </div>
    </div>
  )
}

function TextFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'text' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="space-y-3">
      <Field label={t('text')}>
        <Textarea
          aria-label={t('text')}
          rows={3}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px]">
          <Switch
            checked={block.bold ?? false}
            onCheckedChange={(checked) => onChange({ ...block, bold: checked })}
          />
          {t('bold')}
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <Switch
            checked={block.italic ?? false}
            onCheckedChange={(checked) => onChange({ ...block, italic: checked })}
          />
          {t('italic')}
        </label>
        <Field label={t('align')} className="w-40">
          <Select
            value={block.align ?? 'left'}
            onValueChange={(next) =>
              onChange({ ...block, align: next as Extract<Block, { type: 'text' }>['align'] })
            }
          >
            <SelectTrigger className="w-full" aria-label={t('align')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t('alignLeft')}</SelectItem>
              <SelectItem value="center">{t('alignCenter')}</SelectItem>
              <SelectItem value="right">{t('alignRight')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  )
}

function SignatureFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'signatures' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  const setBox = (index: number, patch: Partial<SignatureBoxSpec>) =>
    onChange({
      ...block,
      boxes: block.boxes.map((box, i) => (i === index ? { ...box, ...patch } : box)),
    })
  return (
    <div className="space-y-3">
      {block.boxes.map((box, index) => (
        <div key={index} className="space-y-2 rounded-md border p-2.5">
          <div className="flex items-center gap-2">
            <Input
              aria-label={`${t('role')} ${index + 1}`}
              value={box.role}
              onChange={(event) => setBox(index, { role: event.target.value })}
            />
            <Badge variant="outline">{box.slot}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField label={`${t('x')}`} value={box.x} onChange={(x) => setBox(index, { x })} />
            <NumberField label={`${t('y')}`} value={box.y} onChange={(y) => setBox(index, { y })} />
            <NumberField label={`${t('w')}`} value={box.w} onChange={(w) => setBox(index, { w })} />
            <NumberField label={`${t('h')}`} value={box.h} onChange={(h) => setBox(index, { h })} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SpacerFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'spacer' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="max-w-40">
      <NumberField
        label={t('height')}
        value={block.height}
        onChange={(height) => onChange({ ...block, height })}
      />
    </div>
  )
}

function FooterFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'footer' }>
  onChange: (next: Block) => void
}) {
  const { t } = useTranslation('doc-templates')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('footerLeft')}>
        <Input
          aria-label={t('footerLeft')}
          value={block.left ?? ''}
          onChange={(event) => onChange({ ...block, left: event.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 self-end text-[13px]">
        <Switch
          checked={block.showPageNumber}
          onCheckedChange={(checked) => onChange({ ...block, showPageNumber: checked })}
        />
        {t('showPageNumber')}
      </label>
    </div>
  )
}
