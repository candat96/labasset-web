import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  CalendarRange,
  Check,
  Coins,
  EllipsisVertical,
  MessageSquarePlus,
  PanelLeft,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format/number'
import { cn } from '@/lib/utils'
import type { AiStatus } from '../api'
import { EquipmentContextChip } from './EquipmentContextChip'

/**
 * Thanh trên khung chat, gọn 1 hàng: nút hiện panel, tiêu đề (sửa inline khi hội thoại mới —
 * API chưa có PATCH tiêu đề), chip ngữ cảnh máy, chip model + ngân sách (tooltip), menu ⋯.
 */
export function ChatHeader({
  title,
  editableTitle,
  onTitleChange,
  streaming,
  equipmentId,
  onClearEquipment,
  status,
  panelOpen,
  onTogglePanel,
  onNew,
  onDelete,
}: {
  title: string
  editableTitle: boolean
  onTitleChange: (value: string) => void
  streaming: boolean
  equipmentId?: string
  onClearEquipment: () => void
  status: AiStatus
  panelOpen: boolean
  onTogglePanel: () => void
  onNew: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation('assistant')
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)

  const startEdit = () => {
    setValue(title)
    setEditing(true)
  }
  const commit = () => {
    onTitleChange(value.trim())
    setEditing(false)
  }
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') setEditing(false)
  }

  const budget = status.budget
  const unlimited = !budget?.monthlyTokenBudget
  const remainingText = unlimited
    ? t('budgetUnlimited')
    : t('budgetRemaining', { value: formatNumber(budget?.remaining ?? 0) || '0' })
  const model = status.chat?.model ?? status.model

  return (
    <header className="border-divider flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      {!panelOpen && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('showPanel')}
          title={t('showPanel')}
          aria-pressed={panelOpen}
          onClick={onTogglePanel}
        >
          <PanelLeft />
        </Button>
      )}
      <div className="bg-primary-soft text-primary grid size-7 shrink-0 place-items-center rounded-md">
        <Bot className="size-4" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {editing ? (
          <>
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={onKey}
              onBlur={commit}
              maxLength={200}
              aria-label={t('titleEdit')}
              className="border-input focus:border-primary h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-[14px] font-semibold outline-none"
            />
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={t('titleSave')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={commit}
            >
              <Check />
            </Button>
          </>
        ) : (
          <>
            <h1 className="truncate text-[14px] leading-5 font-semibold">{title}</h1>
            {editableTitle && (
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-subtle hover:text-foreground shrink-0"
                aria-label={t('titleEdit')}
                title={t('titleEdit')}
                onClick={startEdit}
              >
                <Pencil />
              </Button>
            )}
            <span
              className={cn(
                'hidden shrink-0 items-center gap-1.5 text-[12px] md:inline-flex',
                streaming ? 'text-primary' : 'text-subtle',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  streaming ? 'bg-primary animate-pulse' : 'bg-success',
                )}
                aria-hidden
              />
              {streaming ? t('statusStreaming') : t('statusReady')}
            </span>
          </>
        )}
      </div>
      {equipmentId && (
        <EquipmentContextChip
          equipmentId={equipmentId}
          onClear={onClearEquipment}
          className="hidden max-w-[260px] sm:inline-flex"
        />
      )}
      {model && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="border-divider text-muted-foreground hidden h-7 max-w-[220px] cursor-default items-center gap-1.5 rounded-full border px-2.5 text-[12px] lg:inline-flex"
              tabIndex={0}
              aria-label={t('modelLabel', { name: model })}
            >
              <Sparkles className="text-primary size-3 shrink-0" aria-hidden />
              <span className="truncate">{model}</span>
              <span className="bg-divider h-3 w-px" aria-hidden />
              <Coins className="size-3 shrink-0" aria-hidden />
              <span className="shrink-0">
                {unlimited ? '∞' : formatNumber(budget?.remaining ?? 0) || '0'}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="space-y-0.5">
            <p>{t('modelLabel', { name: model })}</p>
            {status.chat?.baseUrlHost && <p>{status.chat.baseUrlHost}</p>}
            <p>{remainingText}</p>
            {!unlimited && (
              <p>{t('budgetUsed', { value: formatNumber(budget?.used ?? 0) || '0' })}</p>
            )}
            {status.rateLimit?.perHour && (
              <p>{t('rateLimitPerHour', { value: status.rateLimit.perHour })}</p>
            )}
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            aria-label={t('moreActions')}
            title={t('moreActions')}
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={onNew}>
            <MessageSquarePlus />
            {t('new')}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/assistant/digest">
              <CalendarRange />
              {t('digest')}
            </Link>
          </DropdownMenuItem>
          {equipmentId && (
            <DropdownMenuItem onSelect={onClearEquipment} className="sm:hidden">
              <X />
              {t('contextClear')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                {t('deleteConversation')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
