import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string[]
  onChange: (value: string[]) => void
  options: MultiSelectOption[]
  placeholder: string
  ariaLabel?: string
}) {
  const selected = options.filter((option) => value.includes(option.value))
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel ?? placeholder}
          className="border-border bg-card hover:bg-card h-11 w-full justify-between overflow-hidden rounded-md border px-3.5 font-normal shadow-none"
        >
          <span className="flex min-w-0 gap-1 overflow-hidden">
            {selected.length ? (
              selected.map((option) => (
                <span
                  key={option.value}
                  className="bg-muted flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs"
                >
                  <span className="truncate">{option.label}</span>
                  {/*
                   * Bỏ chọn phải là một nút thật và tự bật lại `pointer-events`:
                   * `Button` của shadcn đặt `[&_svg]:pointer-events-none`, nên
                   * icon X trần không bao giờ nhận được cú bấm — bấm X "không
                   * có hiện tượng gì" (bảng lỗi 2026-10-07, mục #25).
                   */}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Bỏ chọn ${option.label}`}
                    className="hover:text-destructive pointer-events-auto shrink-0 [&_svg]:pointer-events-auto"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onChange(value.filter((item) => item !== option.value))
                    }}
                  >
                    <X className="size-3 shrink-0" aria-hidden />
                  </span>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm…" />
          <CommandList>
            <CommandEmpty>Không có kết quả</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() =>
                  onChange(
                    value.includes(option.value)
                      ? value.filter((item) => item !== option.value)
                      : [...value, option.value],
                  )
                }
              >
                <Check
                  className={cn(
                    'size-4',
                    value.includes(option.value) ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
