import { useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const fromIso = (value?: string | null) => {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}
const toIso = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : undefined)

export function DatePicker({
  value,
  onChange,
  placeholder = 'dd/MM/yyyy',
  disabled,
  clearable = true,
  ariaLabel,
  className,
}: {
  value?: string | null
  onChange: (value?: string) => void
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = fromIso(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'h-11 w-full justify-start rounded-md border-0 bg-muted px-3.5 font-normal shadow-none hover:bg-muted',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          <span className="truncate">
            {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          </span>
          {clearable && selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Xoá ngày"
              className="ml-auto rounded"
              onClick={(event) => {
                event.stopPropagation()
                onChange(undefined)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation()
                  onChange(undefined)
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(toIso(date))
            if (date) setOpen(false)
          }}
          locale={vi}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = 'Chọn khoảng ngày',
  ariaLabel,
}: {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const range: DateRange | undefined =
    from || to ? { from: fromIso(from), to: fromIso(to) } : undefined
  const text = range?.from
    ? range.to
      ? `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
      : format(range.from, 'dd/MM/yyyy')
    : placeholder
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            'h-11 w-full justify-start rounded-md border-0 bg-muted px-3.5 font-normal shadow-none hover:bg-muted',
            !range?.from && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          {text}
          {range?.from && (
            <X
              className="ml-auto size-3.5"
              onClick={(event) => {
                event.stopPropagation()
                onChange({})
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(next) => onChange({ from: toIso(next?.from), to: toIso(next?.to) })}
          locale={vi}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
