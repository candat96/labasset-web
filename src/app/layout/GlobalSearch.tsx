import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from '@/components/ui/command'

/** Placeholder: API tìm kiếm toàn cục chưa có. Giữ phím tắt ⌘K để sau nối API. */
export function GlobalSearch() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

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
      <CommandDialog open={open} onOpenChange={setOpen} title={t('actions.search')}>
        <CommandInput placeholder={t('search.hint')} />
        <CommandList>
          <CommandEmpty>{t('search.unavailable')}</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </>
  )
}
