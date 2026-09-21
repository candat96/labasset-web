import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api, unwrap } from '@/api/client'
import { useDebounce } from '@/lib/use-debounce'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

type SearchRow = { id: string; code: string; title: string; subtitle: string; link: string }
const groups = [
  { key: 'equipment', title: 'Thiết bị' },
  { key: 'supplies', title: 'Vật tư' },
  { key: 'repairs', title: 'Sửa chữa' },
  { key: 'requests', title: 'Phiếu yêu cầu' },
  { key: 'faults', title: 'Thư viện lỗi' },
] as const

export function GlobalSearch() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const search = useDebounce(q.trim())
  const navigate = useNavigate()
  const results = useQuery({
    queryKey: ['global-search', search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const data = await unwrap(
        api.GET('/v1/search', { params: { query: { q: search, limit: 5 } } }),
      )
      return groups.map((group) => ({ ...group, items: data[group.key] as SearchRow[] }))
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground hidden w-56 justify-start gap-2 md:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t('search.placeholder')}</span>
        <kbd className="bg-muted rounded px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t('actions.search')}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('actions.search')}
        shouldFilter={false}
      >
        <CommandInput placeholder={t('search.hint')} value={q} onValueChange={setQ} />
        <CommandList>
          {search.length < 2 ? (
            <p className="p-4 text-sm">Nhập ít nhất 2 ký tự</p>
          ) : (
            <>
              {results.isPending && (
                <p role="status" className="p-4">
                  Đang tìm…
                </p>
              )}
              {!results.isPending && <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>}
              {results.data?.map((group) => (
                <CommandGroup key={group.key} heading={group.title}>
                  {group.items.map((row) => (
                    <CommandItem
                      key={row.id}
                      value={`${q} ${row.link} ${row.id} ${row.code} ${row.title}`}
                      onSelect={() => {
                        setOpen(false)
                        navigate(row.link)
                      }}
                    >
                      <span>
                        {row.code} — {row.title}
                      </span>
                      <span className="text-muted-foreground ml-auto text-xs">{row.subtitle}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
