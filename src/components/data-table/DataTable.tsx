import { isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/components/filter-bar'
import { ColumnToggle } from './ColumnToggle'
import { DataTablePagination } from './DataTablePagination'
import type { ServerTableParams } from './useServerTable'

export interface DataTableProps<T> {
  /** Khoá lưu cột ẩn/hiện trong localStorage */
  tableId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  data: T[] | undefined
  total: number
  params: ServerTableParams
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSortChange?: (sort?: string, order?: 'asc' | 'desc') => void
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  toolbarLeft?: ReactNode
  toolbarRight?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  /** Số dòng đang chọn — hiện badge cạnh phân trang khi > 0. */
  selectedCount?: number
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
}

const storageKey = (id: string) => `labasset.table.${id}`

function readVisibility(id: string): VisibilityState {
  try {
    const raw = localStorage.getItem(storageKey(id))
    return raw ? (JSON.parse(raw) as VisibilityState) : {}
  } catch {
    return {}
  }
}

export function DataTable<T>({
  tableId,
  columns,
  data,
  total,
  params,
  onPageChange,
  onLimitChange,
  onSortChange,
  isLoading,
  error,
  onRetry,
  toolbarLeft,
  toolbarRight,
  emptyTitle,
  emptyDescription,
  emptyAction,
  selectedCount,
  getRowId,
  onRowClick,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    readVisibility(tableId),
  )
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(tableId), JSON.stringify(columnVisibility))
    } catch {
      /* bỏ qua */
    }
  }, [tableId, columnVisibility])

  const sorting = useMemo<SortingState>(
    () => (params.sort ? [{ id: params.sort, desc: params.order === 'desc' }] : []),
    [params.sort, params.order],
  )

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { columnVisibility, sorting },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const s = next[0]
      onSortChange?.(s?.id, s ? (s.desc ? 'desc' : 'asc') : undefined)
    },
    manualPagination: true,
    manualSorting: true,
    enableSorting: !!onSortChange,
    rowCount: total,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  })

  const colCount = table.getVisibleLeafColumns().length || 1
  const hasFilterBar = isValidElement(toolbarLeft) && toolbarLeft.type === FilterBar

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          {toolbarLeft && (hasFilterBar ? toolbarLeft : <FilterBar>{toolbarLeft}</FilterBar>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarRight}
          <ColumnToggle table={table} />
        </div>
      </div>
      <div className="bg-card overflow-auto rounded-xl shadow-[var(--shadow-card)] border-0 dark:border dark:border-border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-muted border-divider">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta
                  const canSort = h.column.getCanSort()
                  const dir = h.column.getIsSorted()
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(
                        meta?.align === 'right' && 'text-right',
                        meta?.align === 'center' && 'text-center',
                        meta?.className,
                      )}
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded px-1 font-semibold uppercase"
                          onClick={h.column.getToggleSortingHandler()}
                          aria-label={`${t('table.sort')}: ${meta?.label ?? h.column.id}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`s${i}`} aria-busy>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={j} className="h-11">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colCount}>
                  <ErrorState error={error} onRetry={onRetry} />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount}>
                  <EmptyState
                    title={emptyTitle ?? t('table.empty')}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'h-11 py-1',
                          meta?.align === 'right' && 'text-right tabular-nums',
                          meta?.align === 'center' && 'text-center',
                          meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!error && (
        <DataTablePagination
          page={params.page}
          limit={params.limit}
          total={total}
          selectedCount={selectedCount}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  )
}
