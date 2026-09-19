import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
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

// TODO(api): Chưa có search tổng hợp; lấy kết quả độc lập để lỗi một nhóm không che các nhóm khác.
type SearchRow = { id: string; code?: string; name?: string; title?: string; description?: string }
type SearchPage = { items: SearchRow[] }
const groups = [
  { path: '/v1/equipment', target: '/equipment', title: 'Thiết bị' },
  { path: '/v1/supplies', target: '/supplies', title: 'Vật tư' },
  { path: '/v1/repairs', target: '/repairs', title: 'Sửa chữa' },
  { path: '/v1/requests', target: '/requests', title: 'Phiếu yêu cầu' },
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
      return Promise.all(
        groups.map(async (group) => {
          try {
            const page = await unwrapAs<SearchPage | SearchRow[]>(
              api.GET(group.path, { params: { query: pageQuery({ q: search, limit: 5 }) } }),
            )
            return { ...group, items: Array.isArray(page) ? page : page.items, error: false }
          } catch {
            return { ...group, items: [], error: true }
          }
        }),
      )
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
                <CommandGroup key={group.path} heading={group.title}>
                  {group.error && (
                    <p role="status" className="text-muted-foreground px-2 text-xs">
                      Không tải được nhóm này
                    </p>
                  )}
                  {group.items.map((row) => (
                    <CommandItem
                      key={row.id}
                      value={`${q} ${group.target} ${row.id} ${row.code ?? ''} ${row.name ?? row.title ?? ''}`}
                      onSelect={() => {
                        setOpen(false)
                        navigate(`${group.target}/${row.id}`)
                      }}
                    >
                      {row.code} — {row.name ?? row.title ?? row.description ?? row.id}
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
