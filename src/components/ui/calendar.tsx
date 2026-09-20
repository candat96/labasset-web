import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker className={cn('p-3', className)} classNames={{
    months: 'flex flex-col gap-4 sm:flex-row', month: 'space-y-4', month_caption: 'relative flex h-7 items-center justify-center',
    caption_label: 'text-sm font-medium', nav: 'absolute inset-x-0 top-3 flex items-center justify-between px-3',
    button_previous: cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'size-7'),
    button_next: cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'size-7'), month_grid: 'w-full border-collapse space-y-1',
    weekdays: 'flex', weekday: 'text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal', week: 'mt-2 flex w-full',
    day: 'relative size-9 p-0 text-center text-sm', day_button: cn(buttonVariants({ variant: 'ghost' }), 'size-9 p-0 font-normal'),
    selected: 'bg-primary text-primary-foreground rounded-md', today: 'bg-accent text-accent-foreground rounded-md',
    outside: 'text-muted-foreground opacity-50', disabled: 'text-muted-foreground opacity-50', hidden: 'invisible',
    range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground', ...classNames,
  }} components={{ Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> }} {...props} />
}
