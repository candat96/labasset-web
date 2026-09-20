import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('col-span-full w-full space-y-2', className)}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
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
                Xoá lọc
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
    <div className={cn('min-w-0 space-y-1', className)}>
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      {children}
    </div>
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
