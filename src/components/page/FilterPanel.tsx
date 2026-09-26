import { useEffect, useState, type ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Mặc định mở khi màn ≥ 1600 (§UX quyết định 4). */
export function defaultPanelOpen(width = typeof window === 'undefined' ? 1600 : window.innerWidth) {
  return width >= 1600
}

function readStored(key: string) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : raw === '1'
  } catch {
    return null
  }
}

/**
 * Bố cục danh sách lớn: panel lọc dọc trái 240 thu được + vùng bảng bên phải.
 *
 * Theo §UX quyết định 4: nhớ trạng thái mở/thu theo `storageKey`, mặc định thu khi màn < 1600,
 * và khi panel thu thì các bộ lọc đang áp hiện thành chip gỡ được ngay trên bảng kèm "Xoá lọc".
 * Ô tìm kiếm và chip lọc nhanh truyền qua `toolbar` nên luôn thấy, không nằm trong panel.
 */
export function FilterPanel({
  storageKey,
  fields,
  activeFilters,
  onReset,
  onApply,
  toolbar,
  children,
  className,
}: {
  /** Khoá ghi nhớ trạng thái, ví dụ `equipment`. */
  storageKey: string
  /** Các trường lọc xếp dọc trong panel. */
  fields: ReactNode
  /** Bộ lọc đang áp — hiện thành chip khi panel thu. */
  activeFilters?: Array<{ key: string; label: string; onRemove: () => void }>
  onReset?: () => void
  onApply?: () => void
  /** Ô tìm kiếm + chip lọc nhanh, luôn hiện cạnh nút thu/mở panel. */
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation('common')
  const key = `filter-panel:${storageKey}`
  const [open, setOpen] = useState(() => readStored(key) ?? defaultPanelOpen())
  useEffect(() => {
    try {
      localStorage.setItem(key, open ? '1' : '0')
    } catch {
      /* chế độ riêng tư chặn localStorage — bỏ qua */
    }
  }, [key, open])

  const chips = activeFilters ?? []
  return (
    <div className={cn('flex min-w-0 gap-3', className)} data-slot="filter-panel-layout">
      {open && (
        <aside
          data-testid="filter-panel"
          aria-label={t('filters', { defaultValue: 'Bộ lọc' })}
          className="bg-card shadow-card sticky top-[84px] hidden max-h-[calc(100dvh-100px)] w-60 shrink-0 flex-col rounded-xl lg:flex"
        >
          <header className="border-divider flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-[14px] font-semibold">
              {t('filters', { defaultValue: 'Bộ lọc' })}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('collapseFilters', { defaultValue: 'Thu bộ lọc' })}
              onClick={() => setOpen(false)}
            >
              <PanelLeftClose aria-hidden />
            </Button>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">{fields}</div>
          {(onReset || onApply) && (
            <footer className="border-divider flex gap-2 border-t px-4 py-3">
              {onReset && (
                <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
                  {t('resetFilters', { defaultValue: 'Cài đặt lại' })}
                </Button>
              )}
              {onApply && (
                <Button type="button" className="flex-1" onClick={onApply}>
                  {t('applyFilters', { defaultValue: 'Áp dụng' })}
                </Button>
              )}
            </footer>
          )}
        </aside>
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {!open && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="filter-panel-open"
              onClick={() => setOpen(true)}
            >
              <PanelLeftOpen aria-hidden />
              {t('filters', { defaultValue: 'Bộ lọc' })}
              {chips.length > 0 && (
                <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-[12px] tabular-nums">
                  {chips.length}
                </span>
              )}
            </Button>
          )}
          {toolbar}
        </div>

        {!open && chips.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            data-testid="filter-panel-active-chips"
          >
            {chips.map((filter) => (
              <Badge key={filter.key} variant="outline" asChild>
                <button type="button" onClick={filter.onRemove}>
                  {filter.label}
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {onReset && (
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                {t('clearFilters')}
              </Button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

/** Một trường lọc trong panel: nhãn trên ô, ô nhập cao 44 theo §Chuẩn thành phần. */
export function FilterPanelField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-2', className)} data-filter-label={label}>
      <span className="text-foreground block text-[14px] leading-5">{label}</span>
      <div className="[&_[data-slot=select-trigger]]:w-full [&_button[data-slot=popover-trigger]]:w-full">
        {children}
      </div>
    </div>
  )
}
