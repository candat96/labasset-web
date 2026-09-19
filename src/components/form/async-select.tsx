import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/lib/use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { messageFor } from '@/api/errors'
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
}
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
}: AsyncSelectProps) {
  const id = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const search = useDebounce(q)
  const query = useQuery({
    queryKey: ['reference', queryKey, search],
    queryFn: () => loadOptions(search),
    enabled: open && !disabled,
  })
  const [chosen, setChosen] = useState<ReferenceOption[]>([])
  const ids = Array.isArray(value) ? value : value ? [value] : []
  const known = new Map(
    [...selectedOptions, ...chosen, ...(query.data ?? [])].map((o) => [o.id, o]),
  )
  const missing = ids.filter((key) => !known.has(key))
  const resolved = useQuery({
    queryKey: ['reference', queryKey, 'resolve', missing.join(',')],
    enabled: missing.length > 0 && !disabled,
    queryFn: async () => {
      const found: ReferenceOption[] = []
      for (const key of missing) {
        if (resolveOption) {
          const option = await resolveOption(key)
          if (option) found.push(option)
          continue
        }
        const list = await loadOptions('')
        const match = list.find((item) => item.id === key)
        if (match) found.push(match)
      }
      return found
    },
  })
  const options = new Map([...known.values(), ...(resolved.data ?? [])].map((o) => [o.id, o]))
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {ids.map((key) => (
          <span key={key} className="bg-muted rounded px-2 py-1 text-sm">
            {options.get(key) ? `${options.get(key)!.code} — ${options.get(key)!.name}` : key}
          </span>
        ))}
        {clearable && ids.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(multiple ? [] : null)}
          >
            Bỏ chọn {label}
          </Button>
        )}
      </div>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        value={q}
        disabled={disabled}
        placeholder="Tìm theo mã hoặc tên"
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            document.getElementById(`${id}-options`)?.querySelector('button')?.focus()
          }
        }}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
      />
      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          aria-multiselectable={multiple}
          className="bg-popover max-h-60 overflow-auto rounded-md border p-1"
        >
          {query.isPending && <p role="status">Đang tải…</p>}
          {query.error && (
            <div role="alert">
              {messageFor(query.error)}{' '}
              <Button type="button" variant="ghost" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            </div>
          )}
          {query.data?.length === 0 && (
            <p className="text-muted-foreground p-2">Không có kết quả</p>
          )}
          {query.data?.map((o) => (
            <button
              type="button"
              role="option"
              aria-selected={ids.includes(o.id)}
              key={o.id}
              className="hover:bg-accent focus:bg-accent block min-h-8 w-full rounded px-2 text-left focus:outline-none"
              onClick={() => {
                setChosen((prev) => [...prev.filter((x) => x.id !== o.id), o])
                onChange(
                  multiple
                    ? ids.includes(o.id)
                      ? ids.filter((x) => x !== o.id)
                      : [...ids, o.id]
                    : o.id,
                )
                if (!multiple) setOpen(false)
              }}
            >
              {o.code} — {o.name}
            </button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Đóng danh sách
          </Button>
        </div>
      )}
    </div>
  )
}
