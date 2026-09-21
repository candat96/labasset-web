import { useState } from 'react'
import { Link } from 'react-router'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { ChevronDown, ExternalLink, Loader2, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format/date'
import { cn } from '@/lib/utils'
import type { AiToolResult } from '../api'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/
/** Cột định danh kỹ thuật — ẩn để bảng chỉ còn dữ liệu đọc được. */
const ID_COLUMN = /^(id|uuid)$/i

/** Tên tool → nhãn tiếng Việt; còn lại tự tách snake_case. */
const TOOL_LABELS: Record<string, string> = {
  search_equipment: 'Tra cứu thiết bị',
  get_equipment: 'Hồ sơ máy',
  equipment_timeline: 'Lịch sử máy',
  calibration_due: 'Kiểm định đến hạn',
  list_maintenance_tasks: 'Công việc bảo dưỡng',
  list_repairs: 'Phiếu sửa chữa',
  repair_stats: 'Thống kê sửa chữa',
  list_requests: 'Phiếu yêu cầu',
  get_my_tasks: 'Việc của tôi',
  run_report: 'Báo cáo',
  search_documents: 'Tìm tài liệu',
  search_faults: 'Thư viện lỗi',
  stock_alerts: 'Cảnh báo kho',
  stock_balances: 'Tồn kho',
  stock_runway: 'Dự báo tồn kho',
}

/** Nhãn cột thường gặp; còn lại tự tách camelCase/snake_case. */
const COLUMN_LABELS: Record<string, string> = {
  code: 'Mã',
  name: 'Tên',
  departmentName: 'Khoa/Phòng ban',
  status: 'Trạng thái',
  quantity: 'Số lượng',
  unit: 'ĐVT',
  nextDueAt: 'Hạn tới',
  dueAt: 'Hạn',
  lastPerformedAt: 'Lần trước',
  overdueDays: 'Quá hạn (ngày)',
  expiryDate: 'Hạn dùng',
  location: 'Vị trí',
  model: 'Model',
  serial: 'Serial',
  staffName: 'Phụ trách',
  equipmentCode: 'Mã máy',
  equipmentName: 'Tên máy',
  total: 'Tổng',
}

function humanize(key: string) {
  const text = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function toolLabel(name: string) {
  return TOOL_LABELS[name] ?? humanize(name)
}

function columnLabel(key: string) {
  return COLUMN_LABELS[key] ?? humanize(key)
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'string' && ISO_DATE.test(value)) return formatDate(value) || value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function ToolTable({ tool }: { tool: AiToolResult }) {
  const { t } = useTranslation('assistant')
  const rows = (tool.rows ?? []).slice(0, 50)
  const keys = Object.keys(rows[0] ?? {})
  const visible = keys.filter((key) => !ID_COLUMN.test(key) && !/Id$/.test(key))
  const columns = visible.length > 0 ? visible : keys
  return (
    <div className="border-divider bg-card overflow-hidden rounded-lg border">
      {rows.length > 0 ? (
        <div className="max-h-72 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    {columnLabel(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="max-w-56 truncate text-[12.5px]">
                      {cell(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground px-3 py-2 text-[12.5px]">
          {tool.summary ?? (tool.status === 'failed' ? t('toolFailed') : t('toolNoRows'))}
        </p>
      )}
      {tool.link && (
        <Link
          className="border-divider text-primary flex items-center gap-1.5 border-t px-3 py-2 text-[12.5px] font-medium hover:underline"
          to={tool.link}
        >
          <ExternalLink className="size-3.5" aria-hidden />
          {t('toolOpen')}
        </Link>
      )}
    </div>
  )
}

/**
 * Kết quả tool gọn trong 1 hàng chip "🔧 Tra cứu thiết bị · 3 dòng"; bấm chip mở bảng dữ liệu
 * bên dưới (Collapsible). Tool đang chạy hiện chip xoay.
 */
export function ToolChips({ tools, className }: { tools: AiToolResult[]; className?: string }) {
  const { t } = useTranslation('assistant')
  const [openIndex, setOpenIndex] = useState<number>()
  if (tools.length === 0) return null
  const open = openIndex === undefined ? undefined : tools[openIndex]
  return (
    <CollapsiblePrimitive.Root
      open={!!open}
      onOpenChange={(next) => !next && setOpenIndex(undefined)}
      className={cn('space-y-2', className)}
    >
      <div className="flex flex-wrap items-center gap-1.5" data-testid="tool-chips">
        {tools.map((tool, index) => {
          const running = tool.status === 'running'
          const failed = tool.status === 'failed'
          const expanded = index === openIndex
          return (
            <button
              key={index}
              type="button"
              aria-expanded={expanded}
              aria-label={`${running ? t('toolRunning') : failed ? t('toolFailed') : t('toolDone')}: ${toolLabel(tool.name)}`}
              title={tool.name}
              disabled={running}
              onClick={() => setOpenIndex(expanded ? undefined : index)}
              className={cn(
                'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-[12px] leading-none transition-colors',
                'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
                failed
                  ? 'border-destructive/30 bg-destructive-bg text-destructive-fg'
                  : expanded
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-divider bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                running && 'text-primary border-primary/30',
              )}
            >
              {running ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Wrench className="size-3.5" aria-hidden />
              )}
              <span className="truncate font-medium">{toolLabel(tool.name)}</span>
              {tool.summary && !running && (
                <span className="text-subtle truncate">· {tool.summary}</span>
              )}
              {!running && (
                <ChevronDown
                  className={cn('size-3 shrink-0 transition-transform', expanded && 'rotate-180')}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
      <CollapsiblePrimitive.Content>
        {open && <ToolTable tool={open} />}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  )
}
