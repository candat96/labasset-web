import type { ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { InFilterFieldContext } from '@/components/filter-field-context'
import { cn } from '@/lib/utils'

export { useInFilterField } from '@/components/filter-field-context'

export function FilterBar({
  children,
  presets,
  actions,
  activeFilters,
  onClear,
  className,
}: {
  children: ReactNode
  presets?: ReactNode
  actions?: ReactNode
  activeFilters?: Array<{ key: string; label: string; onRemove: () => void }>
  onClear?: () => void
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <div className={cn('col-span-full w-full space-y-2', className)} data-slot="filter-bar">
      <div
        className="grid grid-cols-2 items-start gap-x-4 gap-y-3 md:grid-cols-3 xl:grid-cols-5"
        data-slot="filter-grid"
      >
        {children}
      </div>
      {(presets || actions || activeFilters?.length || onClear) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets}
            {activeFilters?.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.onRemove}
                className="bg-primary-soft text-secondary-foreground hover:bg-primary-soft/70 flex h-8 items-center gap-1.5 rounded-full pr-2.5 pl-3.5 text-[13px] font-medium whitespace-nowrap transition-colors"
              >
                {filter.label}
                <X className="size-3.5" aria-hidden />
              </button>
            ))}
            {onClear && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                {t('clearFilters')}
              </Button>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}
export function FilterField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <InFilterFieldContext.Provider value={true}>
      <div
        className={cn(
          // Mọi kiểu ô trong thanh lọc (Select, MultiSelect, AsyncSelect, DatePicker)
          // phải CÙNG cao 44 — trước đây Select bị ép h-9 còn các ô khác h-11, nên
          // nhãn của chúng lệch nhau một bậc trên cùng một hàng.
          'min-w-0',
          '[&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full',
          '[&_[data-slot=popover-trigger]]:w-full',
          '[&_button]:h-11 [&_button]:w-full [&_input]:h-11 [&_input]:w-full',
          '[&>div]:space-y-0',
          className,
        )}
        data-filter-label={label}
      >
        <Label className="flex min-w-0 flex-col items-stretch font-medium">
          <span
            data-slot="filter-title"
            className="text-muted-foreground mb-2 block h-5 truncate text-[13px] leading-5 font-medium"
          >
            {label}
          </span>
          {children}
        </Label>
      </div>
    </InFilterFieldContext.Provider>
  )
}

export function MoreFilters({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-slot="more-filters"
          className="h-11 w-full justify-between font-normal"
        >
          {t('moreFilters')}
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-80 gap-2">
        {children}
      </PopoverContent>
    </Popover>
  )
}
export function FilterPreset({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-primary-soft text-secondary-foreground'
          : // Nền trắng + viền: nếu dùng `--muted` thì chip chìm hẳn vào nền xám của trang.
            'border-border bg-card text-muted-foreground hover:text-foreground border',
      )}
    >
      {children}
    </button>
  )
}
