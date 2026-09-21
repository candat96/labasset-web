import { useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { useDebounce } from '@/lib/use-debounce'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'

export interface ReferenceOption {
  id: string
  code: string
  name: string
}
export interface AsyncSelectProps {
  label: string
  queryKey: string
  loadOptions: (q: string) => Promise<ReferenceOption[]>
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  multiple?: boolean
  clearable?: boolean
  disabled?: boolean
  selectedOptions?: ReferenceOption[]
  resolveOption?: (id: string) => Promise<ReferenceOption | null>
  placeholder?: string
  showLabel?: boolean
  className?: string
}

const optionLabel = (option: ReferenceOption) =>
  option.code ? `${option.code} — ${option.name}` : option.name

export function AsyncSelect({
  label,
  queryKey,
  loadOptions,
  value,
  onChange,
  multiple,
  clearable,
  disabled,
  selectedOptions = [],
  resolveOption,
  placeholder,
  showLabel = true,
  className,
}: AsyncSelectProps) {
  const id = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<ReferenceOption[]>([])
  const search = useDebounce(q)
  const ids = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value])
  const query = useQuery({
    queryKey: ['reference', queryKey, search],
    queryFn: () => loadOptions(search),
    enabled: open && !disabled,
  })
  const known = useMemo(
    () => new Map([...selectedOptions, ...chosen, ...(query.data ?? [])].map((o) => [o.id, o])),
    [chosen, query.data, selectedOptions],
  )
  const missing = ids.filter((key) => !known.has(key))
  const resolved = useQuery({
    queryKey: ['reference', queryKey, 'resolve', missing.join(',')],
    enabled: missing.length > 0 && !disabled,
    queryFn: async () => {
      const found: ReferenceOption[] = []
      const fallback = resolveOption ? null : await loadOptions('')
      for (const key of missing) {
        const option = resolveOption
          ? await resolveOption(key)
          : (fallback?.find((item) => item.id === key) ?? null)
        if (option) found.push(option)
      }
      return found
    },
  })
  const options = new Map([...known.values(), ...(resolved.data ?? [])].map((o) => [o.id, o]))
  const selection = ids.map((key) => options.get(key)).filter(Boolean) as ReferenceOption[]
  const remove = (key: string) => onChange(multiple ? ids.filter((item) => item !== key) : null)

  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            variant="outline"
            disabled={disabled}
            className="h-9 w-full justify-between overflow-hidden bg-transparent px-3 font-normal shadow-xs hover:bg-transparent dark:bg-input/30 dark:hover:bg-input/50"
          >
            <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {selection.length ? (
                selection.map((option) => (
                  <span
                    key={option.id}
                    className={cn(
                      'flex min-w-0 items-center gap-1 truncate',
                      multiple && 'bg-muted rounded px-1.5 py-0.5 text-xs',
                    )}
                  >
                    <span className="truncate">{optionLabel(option)}</span>
                    {(clearable || multiple) && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Bỏ ${optionLabel(option)}`}
                        className="hover:text-destructive shrink-0 rounded"
                        onClick={(event) => {
                          event.stopPropagation()
                          remove(option.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            remove(option.id)
                          }
                        }}
                      >
                        <X className="size-3" />
                      </span>
                    )}
                  </span>
                ))
              ) : ids.length ? (
                <span className="text-muted-foreground truncate">Đang tải giá trị…</span>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder ?? label}</span>
              )}
            </span>
            <ChevronDown className="text-muted-foreground ml-2 size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={q} onValueChange={setQ} placeholder="Tìm theo mã hoặc tên" />
            <CommandList>
              {query.isPending && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm" role="status">
                  <Loader2 className="size-4 animate-spin" /> Đang tải…
                </div>
              )}
              {query.error && (
                <div className="text-destructive p-3 text-sm" role="alert">
                  {messageFor(query.error)}{' '}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void query.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              )}
              {!query.isPending && !query.error && (query.data?.length ?? 0) === 0 && (
                <CommandEmpty>Không có kết quả</CommandEmpty>
              )}
              {query.data?.map((option) => {
                const selected = ids.includes(option.id)
                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      setChosen((prev) => [...prev.filter((item) => item.id !== option.id), option])
                      onChange(
                        multiple
                          ? selected
                            ? ids.filter((item) => item !== option.id)
                            : [...ids, option.id]
                          : option.id,
                      )
                      if (!multiple) setOpen(false)
                    }}
                  >
                    <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{optionLabel(option)}</span>
                  </CommandItem>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
