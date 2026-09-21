import type { ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
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
        className="grid grid-cols-2 items-end gap-2 md:grid-cols-3 xl:grid-cols-5"
        data-slot="filter-grid"
      >
        {children}
      </div>
      {(presets || actions || activeFilters?.length || onClear) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets}
            {activeFilters?.map((filter) => (
              <Badge key={filter.key} variant="outline" asChild>
                <button type="button" onClick={filter.onRemove}>
                  {filter.label}
                  <X className="size-3" />
                </button>
              </Badge>
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
          'min-w-0 [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=popover-trigger]]:w-full [&_button]:min-h-9 [&_input]:h-9 [&_input]:w-full [&>div]:space-y-0',
          className,
        )}
        data-filter-label={label}
      >
        <Label className="flex min-w-0 flex-col items-stretch font-medium">
          <span
            data-slot="filter-title"
            className="mb-1 block text-xs font-medium text-muted-foreground"
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
          className="h-9 w-full justify-between font-normal"
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
    <Badge variant={active ? 'default' : 'outline'} asChild>
      <button type="button" onClick={onClick}>
        {children}
      </button>
    </Badge>
  )
}
