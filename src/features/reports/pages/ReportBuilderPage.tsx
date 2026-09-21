import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionCard } from '@/components/page/SectionCard'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import {
  listReportSources,
  opsForType,
  previewCustomReport,
  runCustomReport,
  saveCustomReport,
  type CustomReport,
  type CustomReportDefinition,
  type CustomReportFilter,
  type ReportPreview,
} from '../api'

export function Component() {
  const { t } = useTranslation('reports')
  const qc = useQueryClient()
  const sources = useQuery({ queryKey: ['report-sources'], queryFn: listReportSources })
  const [name, setName] = useState('')
  const [source, setSource] = useState<CustomReportDefinition['source']>('equipment')
  const [columns, setColumns] = useState<string[]>(['code', 'name'])
  const [filters, setFilters] = useState<CustomReportFilter[]>([])
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [shared, setShared] = useState(false)
  const [preview, setPreview] = useState<ReportPreview>()
  const [saved, setSaved] = useState<CustomReport>()
  const selected = (sources.data ?? []).find((row) => row.source === source)
  const fields = Object.entries(selected?.fields ?? {})
  const definition = (): CustomReportDefinition => ({
    name,
    shared,
    source,
    columns,
    filters,
    groupBy,
    aggregates: [],
    sort: null,
  })
  const previewMutation = useMutation({
    mutationFn: () => previewCustomReport(definition()),
    onSuccess: setPreview,
    onError: (error) => toast.error(messageFor(error)),
  })
  const saveMutation = useMutation({
    mutationFn: () => saveCustomReport(definition()),
    onSuccess: (report) => {
      setSaved(report)
      toast.success(t('saved'))
      void qc.invalidateQueries({ queryKey: ['custom-reports'] })
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const runMutation = useMutation({
    mutationFn: (format: 'xlsx' | 'pdf') => runCustomReport(saved!.id, format),
    onSuccess: () => {
      toast.success(t('jobCreated'))
      void qc.invalidateQueries({ queryKey: ['report-jobs'] })
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  return (
    <>
      <PageHeader title={t('builderTitle')} />
      <p className="text-muted-foreground mb-4 text-sm">{t('builderNote')}</p>
      <div className="max-w-4xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="report-name">{t('name')}</Label>
            <Input
              id="report-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-source">{t('source')}</Label>
            <select
              id="report-source"
              className="border-input h-9 w-full rounded-md border px-3 text-sm"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as CustomReportDefinition['source'])
                setColumns([])
                setFilters([])
                setGroupBy([])
              }}
            >
              {(sources.data ?? []).map((row) => (
                <option key={row.source} value={row.source}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {t('columns')} ({columns.length}/20)
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {fields.map(([key, field]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={columns.includes(key)}
                  onCheckedChange={(on) =>
                    setColumns((current) =>
                      on === true
                        ? [...current, key].slice(0, 20)
                        : current.filter((item) => item !== key),
                    )
                  }
                />
                {field.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Nhóm theo ({groupBy.length}/3)</legend>
          <div className="flex flex-wrap gap-2">
            {fields.map(([key, field]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={groupBy.includes(key)}
                  onCheckedChange={(on) =>
                    setGroupBy((current) =>
                      on === true
                        ? [...current, key].slice(0, 3)
                        : current.filter((item) => item !== key),
                    )
                  }
                />
                {field.label}
              </label>
            ))}
          </div>
        </fieldset>
        <section>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((current) =>
                current.length >= 10 || fields.length === 0
                  ? current
                  : [...current, { field: fields[0]![0], op: 'eq', value: '' }],
              )
            }
          >
            {t('addFilter')} ({filters.length}/10)
          </Button>
          <ul className="mt-2 space-y-2">
            {filters.map((filter, index) => {
              const field = selected?.fields[filter.field]
              const ops = field ? opsForType(field.type) : ['eq']
              return (
                <li key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
                  <select
                    aria-label={t('filterField', { index: index + 1 })}
                    className="rounded-md border px-2"
                    value={filter.field}
                    onChange={(event) =>
                      setFilters((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, field: event.target.value, op: 'eq' } : row,
                        ),
                      )
                    }
                  >
                    {fields.map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Phép lọc ${index + 1}`}
                    className="rounded-md border px-2"
                    value={filter.op}
                    onChange={(event) =>
                      setFilters((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, op: event.target.value } : row,
                        ),
                      )
                    }
                  >
                    {ops.map((op) => (
                      <option key={op}>{op}</option>
                    ))}
                  </select>
                  <Input
                    aria-label={t('filterValue', { index: index + 1 })}
                    disabled={filter.op === 'isNull' || filter.op === 'notNull'}
                    value={filter.value == null ? '' : String(filter.value)}
                    onChange={(event) =>
                      setFilters((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, value: event.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    onClick={() => setFilters((current) => current.filter((_, i) => i !== index))}
                  >
                    Xoá
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={shared} onCheckedChange={(on) => setShared(on === true)} />
          Chia sẻ báo cáo
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!columns.length || previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
          >
            {t('preview')}
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || !columns.length || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Lưu
          </Button>
          {saved && (
            <>
              <Button type="button" variant="outline" onClick={() => runMutation.mutate('xlsx')}>
                {t('runExcel')}
              </Button>
              <Button type="button" variant="outline" onClick={() => runMutation.mutate('pdf')}>
                {t('runPdf')}
              </Button>
            </>
          )}
        </div>
        {preview && (
          <SectionCard
            title={t('preview', { defaultValue: 'Xem trước' })}
            description={`${preview.rows.length} dòng${preview.truncated ? ' · đã rút gọn' : ''}`}
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.columns.map((column) => (
                    <TableHead key={column.key} className="text-left">
                      {column.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, index) => (
                  <TableRow key={index}>
                    {preview.columns.map((column) => (
                      <TableCell key={column.key}>{String(row[column.key] ?? '—')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}
      </div>
    </>
  )
}
