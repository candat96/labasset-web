import { Clock3, PanelLeftClose, Search, SquarePen, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format/date'
import { cn } from '@/lib/utils'
import type { AiConversation } from '../api'

/**
 * Panel hội thoại 260px (ẩn/hiện được): tìm nhanh, chọn, xoá (xác nhận ở trang), nút hội thoại mới.
 * Mỗi dòng: tiêu đề là nút (tên truy cập đúng bằng tiêu đề) + thời gian cập nhật.
 */
export function ConversationSidebar({
  conversations,
  loading,
  activeId,
  search,
  onSearch,
  onNew,
  onSelect,
  onDelete,
  onHide,
  className,
}: {
  conversations: AiConversation[]
  loading?: boolean
  activeId?: string
  search: string
  onSearch: (value: string) => void
  onNew: () => void
  onSelect: (row: AiConversation) => void
  onDelete: (row: AiConversation) => void
  onHide?: () => void
  className?: string
}) {
  const { t } = useTranslation('assistant')
  return (
    <aside
      aria-label={t('conversations')}
      className={cn('bg-surface-2 flex min-w-0 flex-col overflow-hidden', className)}
    >
      <header className="flex items-center gap-1 px-3 pt-3 pb-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-wide uppercase">
          {t('conversations')}
        </h2>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onNew}
          aria-label={t('new')}
          title={t('new')}
        >
          <SquarePen className="size-3.5" />
        </Button>
        {onHide && (
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={onHide}
            aria-label={t('hidePanel')}
            title={t('hidePanel')}
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        )}
      </header>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            className="text-subtle pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            className="bg-card h-8 pl-8 text-[13px]"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t('searchConversations')}
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="px-2.5 py-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </li>
          ))}
        {!loading &&
          conversations.map((row) => {
            const active = row.id === activeId
            return (
              <li
                key={row.id}
                className={cn(
                  'group/conv rounded-lg transition-colors',
                  active ? 'bg-card shadow-card' : 'hover:bg-card/70',
                )}
              >
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    aria-label={row.title}
                    className="focus-visible:ring-ring/50 min-w-0 flex-1 rounded-lg px-2.5 pt-1.5 text-left focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => onSelect(row)}
                  >
                    <span
                      className={cn(
                        'block truncate text-[13px]',
                        active ? 'text-primary font-semibold' : 'text-foreground font-medium',
                      )}
                    >
                      {row.title}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-subtle hover:text-destructive mt-0.5 mr-1 opacity-0 group-hover/conv:opacity-100 focus-visible:opacity-100"
                    aria-label={`${t('delete')} ${row.title}`}
                    onClick={() => onDelete(row)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <p className="text-subtle flex items-center gap-1 px-2.5 pb-1.5 text-[11px]">
                  <Clock3 className="size-3" aria-hidden />
                  {formatRelative(row.updatedAt)}
                </p>
              </li>
            )
          })}
        {!loading && conversations.length === 0 && (
          <li className="text-muted-foreground px-3 py-6 text-center text-[12.5px]">
            <p className="text-foreground font-medium">{t('noConversations')}</p>
            <p className="mt-1">{t('noConversationsHint')}</p>
          </li>
        )}
      </ul>
    </aside>
  )
}
