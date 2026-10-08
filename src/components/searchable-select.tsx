import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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

export interface SelectOneOption {
  value: string
  label: string
}

/**
 * Ô chọn một giá trị có ô tìm kiếm ngay trong danh sách thả xuống.
 *
 * Dùng khi danh sách dài (loại thông báo, loại tài liệu…): cuộn tay qua vài
 * chục dòng là việc người dùng phải làm mỗi lần lọc (bảng lỗi 2026-10-07,
 * mục #4 nhóm thông báo). Danh sách ngắn thì `Select` thường vẫn gọn hơn.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Tìm…',
  emptyLabel = 'Không có kết quả',
  ariaLabel,
  id,
  className,
}: {
  value?: string | null
  onChange: (value: string | undefined) => void
  options: SelectOneOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyLabel?: string
  ariaLabel?: string
  id?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            'border-border bg-card hover:bg-card h-11 w-full justify-between rounded-md border px-3.5 font-normal shadow-none',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  // Chọn lại chính giá trị đang chọn là bỏ chọn — không phải mở
                  // menu lần nữa đi tìm dòng "tất cả".
                  onChange(option.value === value ? undefined : option.value)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')}
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
