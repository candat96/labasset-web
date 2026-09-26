import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { isApiError, messageFor } from '@/api/errors'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { FileBarChart2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { cn } from '@/lib/utils'
import {
  listReportsSafe,
  paramErrorsFrom,
  runReport,
  runReportJob,
  type ReportColumn,
  type ReportMeta,
  type ReportParamValues,
} from '../api'
import { SchemaParamsForm, type SchemaParamsFormHandle } from '../schema-form'
import { useTranslation } from 'react-i18next'

function formatCell(type: ReportColumn['type'], value: unknown): string {
  if (value == null || value === '') return '—'
  if (type === 'money') return formatVnd(String(value))
  if (type === 'number') return typeof value === 'string' ? formatQty(value) : String(value)
  if (type === 'date') return formatDate(String(value)) || String(value)
  if (type === 'datetime') return formatDateTime(String(value)) || String(value)
  if (type === 'percent') return `${String(value)}%`
  return String(value)
}

function groupedReports(reports: ReportMeta[]) {
  const groups: { name: string; items: ReportMeta[] }[] = []
  const index = new Map<string, number>()
  for (const row of reports) {
    let at = index.get(row.group)
    if (at === undefined) {
      at = groups.length
      index.set(row.group, at)
      groups.push({ name: row.group, items: [] })
    }
    groups[at]?.items.push(row)
  }
  return groups
}

export function Component() {
  const { t } = useTranslation('reports')

  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const table = useServerTable({ filterKeys: ['key'] })
  const key = table.params.filters.key ?? sp.get('key') ?? undefined
  const formRef = useRef<SchemaParamsFormHandle>(null)
  const [submitted, setSubmitted] = useState<ReportParamValues | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [tooLarge, setTooLarge] = useState(false)
  const [bgFormat, setBgFormat] = useState<'xlsx' | 'pdf'>('xlsx')

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: listReportsSafe,
  })
  const reports = reportsQuery.data ?? []
  const selected = reports.find((row) => row.key === key)
  const groups = groupedReports(reports)

  const selectKey = (next: string) => {
    setSubmitted(null)
    setFieldErrors({})
    setTooLarge(false)
    table.setFilters({ key: next })
    setSp({ key: next }, { replace: true })
  }

  const readParams = () => formRef.current?.getValues() ?? {}

  const view = useQuery({
    queryKey: ['reports', 'run', selected?.key, submitted, table.params.page, table.params.limit],
    queryFn: () =>
      runReport(
        selected!.key,
        submitted ?? {},
        'json',
        table.params.page,
        table.params.limit,
      ) as Promise<NonNullable<Awaited<ReturnType<typeof runReport>>>>,
    enabled: !!selected && !!submitted,
  })

  const viewTooLarge = isApiError(view.error) && view.error.code === 'REPORT_TOO_LARGE'
  const showBackground = tooLarge || viewTooLarge

  const exportReport = useMutation({
    mutationFn: (format: 'xlsx' | 'pdf') => runReport(selected!.key, readParams(), format),
    onSuccess: () => toast.success(t('fileDownloaded')),
    onError: (error, format) => {
      if (isApiError(error) && error.code === 'REPORT_TOO_LARGE') {
        setTooLarge(true)
        setBgFormat(format)
        return
      }
      if (isApiError(error) && error.code === 'REPORT_PARAMS_INVALID') {
        setFieldErrors(paramErrorsFrom(error))
      }
      toast.error(messageFor(error))
    },
  })

  const background = useMutation({
    mutationFn: () => runReportJob(selected!.key, readParams(), bgFormat),
    onSuccess: () => {
      toast.success(t('jobCreated'))
      void qc.invalidateQueries({ queryKey: ['report-jobs'] })
      void navigate('/reports/jobs')
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const onView = () => {
    setFieldErrors({})
    setTooLarge(false)
    const params = readParams()
    if (table.params.page !== 1) table.setPage(1)
    setSubmitted(params)
    setSp({ key: selected!.key, params: JSON.stringify(params) }, { replace: true })
  }

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const defs = view.data?.columns ?? selected?.columns ?? []
    return defs.map((col) => ({
      accessorKey: col.key,
      header: col.title,
      cell: ({ getValue }) => formatCell(col.type, getValue()),
    }))
  }, [selected?.columns, view.data?.columns])

  const rows = (view.data?.rows ?? []).map((row, index) => ({
    ...row,
    _rid: String(row.id ?? row.code ?? index),
  }))

  return (
    <>
      <PageHeader
        title={t('report')}
        description={t('reportsNote')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/reports/jobs">{t('jobsTitle')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reports/builder">{t('builderTitle')}</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SectionCard
          title={t('reportList')}
          className="lg:sticky lg:top-[72px] lg:self-start"
          bodyClassName="space-y-4"
        >
          <div data-testid="report-list" className="space-y-4">
            {groups.map((group) => (
              <section key={group.name}>
                <h3 className="text-muted-foreground mb-1.5 text-[12px] font-semibold tracking-[0.05em] uppercase">
                  {t(`groups.${group.name}`, { defaultValue: group.name })}
                </h3>
                <ul className="space-y-0.5">
                  {group.items.map((row) => (
                    <li key={row.key}>
                      <button
                        type="button"
                        className={cn(
                          'hover:bg-muted/70 w-full rounded-md px-2.5 py-1.5 text-left text-[13.5px] transition-colors',
                          row.key === key
                            ? 'bg-primary-soft text-primary font-semibold'
                            : 'text-foreground',
                        )}
                        onClick={() => selectKey(row.key)}
                      >
                        {row.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </SectionCard>
        <div className="min-w-0">
          {selected ? (
            <div className="space-y-5">
              <SectionCard
                title={selected.title}
                description={t('paramsHint')}
                footer={
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={onView} disabled={view.isFetching}>
                      Xem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selected || exportReport.isPending}
                      onClick={() => exportReport.mutate('xlsx')}
                    >
                      {t('exportExcel')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selected || exportReport.isPending}
                      onClick={() => exportReport.mutate('pdf')}
                    >
                      {t('exportPdf')}
                    </Button>
                  </div>
                }
              >
                <SchemaParamsForm
                  key={selected.key}
                  ref={formRef}
                  schema={selected.params}
                  fieldErrors={fieldErrors}
                />
              </SectionCard>
              {showBackground && (
                <Alert>
                  <AlertTitle>{t('tooLarge')}</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-2">
                    {t('tooLargeDesc')}
                    <Button
                      type="button"
                      size="sm"
                      disabled={background.isPending}
                      onClick={() => background.mutate()}
                    >
                      {t('runBackground')}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {view.error && !viewTooLarge && (
                <p role="alert" className="text-destructive text-sm">
                  {messageFor(view.error)}
                </p>
              )}
              {submitted && (
                <DataTable
                  tableId={`report-${selected.key}`}
                  columns={columns}
                  data={rows}
                  total={view.data?.total ?? 0}
                  params={table.params}
                  onPageChange={table.setPage}
                  onLimitChange={table.setLimit}
                  isLoading={view.isPending || view.isFetching}
                  error={viewTooLarge ? undefined : view.error}
                  onRetry={() => void view.refetch()}
                  getRowId={(row) => String(row._rid)}
                  emptyTitle={t('emptyRows')}
                  toolbarLeft={<FilterBar>{null}</FilterBar>}
                />
              )}
            </div>
          ) : (
            <SectionCard>
              <EmptyState icon={FileBarChart2} title={t('pickReport')} />
            </SectionCard>
          )}
        </div>
      </div>
    </>
  )
}
