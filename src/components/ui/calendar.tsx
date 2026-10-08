import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

/**
 * Lịch chọn ngày.
 *
 * Mặc định cho phép chọn tháng và năm bằng hai ô thả xuống, khoảng năm trải từ
 * 60 năm trước tới 10 năm sau: chỉ có hai mũi tên chuyển từng tháng thì nhập
 * ngày sản xuất của một máy mua năm 2008 phải bấm hơn hai trăm lần — người
 * dùng báo là "không chọn được năm và tháng khác" (bảng lỗi 2026-10-07, #15).
 */
export function Calendar({
  className,
  classNames,
  captionLayout = 'dropdown',
  startMonth = new Date(new Date().getFullYear() - 60, 0),
  endMonth = new Date(new Date().getFullYear() + 10, 11),
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker className={cn('p-3', className)} captionLayout={captionLayout} startMonth={startMonth} endMonth={endMonth} classNames={{
    months: 'flex flex-col gap-4 sm:flex-row', month: 'space-y-4', month_caption: 'relative flex h-7 items-center justify-center',
    caption_label: 'text-sm font-medium',
    // `z-10`: thanh điều hướng nằm tuyệt đối, còn khối tiêu đề tháng đứng sau nó
    // trong DOM nên vẽ đè lên và nuốt cú bấm hai nút chuyển tháng.
    nav: 'absolute inset-x-0 top-3 z-10 flex items-center justify-between px-3',
    // Hai ô thả xuống tháng/năm nằm giữa, chừa chỗ hai bên cho nút chuyển tháng.
    dropdowns: 'flex items-center justify-center gap-1.5 px-9',
    dropdown_root: 'relative',
    dropdown:
      'border-border bg-card focus-visible:ring-ring/50 h-7 rounded-md border px-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none',
    years_dropdown: 'tabular-nums',
    button_previous: cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'size-7'),
    button_next: cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'size-7'), month_grid: 'w-full border-collapse space-y-1',
    weekdays: 'flex', weekday: 'text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal', week: 'mt-2 flex w-full',
    day: 'relative size-9 p-0 text-center text-sm', day_button: cn(buttonVariants({ variant: 'ghost' }), 'size-9 p-0 font-normal'),
    selected: 'bg-primary text-primary-foreground rounded-md', today: 'bg-accent text-accent-foreground rounded-md',
    outside: 'text-muted-foreground opacity-50', disabled: 'text-muted-foreground opacity-50', hidden: 'invisible',
    range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground', ...classNames,
  }} labels={{
    labelPrevious: () => 'Tháng trước',
    labelNext: () => 'Tháng sau',
  }} components={{ Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> }} {...props} />
}
