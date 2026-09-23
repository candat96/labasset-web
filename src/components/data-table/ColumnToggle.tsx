import type { Table } from '@tanstack/react-table'
import { Columns3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { columnLabel } from './column-label'

export function ColumnToggle<T>({ table }: { table: Table<T> }) {
  const { t } = useTranslation()
  const columns = table.getAllLeafColumns().filter((c) => c.getCanHide())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('table.columns')}>
          <Columns3 aria-hidden />
          <span className="hidden sm:inline">{t('table.columns')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.getIsVisible()}
            onCheckedChange={(v) => c.toggleVisibility(!!v)}
            onSelect={(e) => e.preventDefault()}
          >
            {columnLabel(c)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
