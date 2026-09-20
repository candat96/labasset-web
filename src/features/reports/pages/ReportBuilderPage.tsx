import { useState } from 'react'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'

const SOURCES = [
  {
    id: 'equipment',
    labelKey: 'sourceEquipment',
    fields: ['code', 'name', 'status', 'departmentId'],
  },
  { id: 'repairs', labelKey: 'sourceRepairs', fields: ['code', 'status', 'totalCost', 'openedAt'] },
  { id: 'supplies', labelKey: 'sourceSupplies', fields: ['code', 'name', 'minQty'] },
  { id: 'stocktakes', labelKey: 'sourceStocktakes', fields: ['code', 'status', 'diffQty'] },
]

export function Component() {
  const { t } = useTranslation('reports')

  const [name, setName] = useState('')
  const [source, setSource] = useState(SOURCES[0]?.id ?? 'equipment')
  const [columns, setColumns] = useState<string[]>(['code', 'name'])
  const [filters, setFilters] = useState<{ field: string; op: string; value: string }[]>([])
  const fields = SOURCES.find((row) => row.id === source)?.fields ?? []
  return (
    <>
      <PageHeader title={t('builderTitle')} />
      <p className="text-muted-foreground mb-4 text-sm">{t('builderNote')}</p>
      <div className="max-w-xl space-y-4">
        <div className="space-y-1">
          <Label htmlFor="report-name">{t('name')}</Label>
          <Input id="report-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-source">{t('source')}</Label>
          <select
            id="report-source"
            className="border-input h-9 w-full rounded-md border px-3 text-sm"
            value={source}
            onChange={(event) => {
              setSource(event.target.value)
              setColumns([])
            }}
          >
            {SOURCES.map((row) => (
              <option key={row.id} value={row.id}>
                {t(row.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('columns')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={columns.includes(field)}
                  onCheckedChange={(on) =>
                    setColumns((current) =>
                      on === true
                        ? [...current, field].slice(0, 20)
                        : current.filter((item) => item !== field),
                    )
                  }
                />
                {field}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((current) =>
                current.length >= 10
                  ? current
                  : [...current, { field: fields[0] ?? 'code', op: 'eq', value: '' }],
              )
            }
          >
            {t('addFilter')}
          </Button>
          <ul className="mt-2 space-y-2">
            {filters.map((filter, index) => (
              <li key={index} className="flex gap-2">
                <Input
                  aria-label={t('filterField', { index: index + 1 })}
                  value={filter.field}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, field: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={t('filterValue', { index: index + 1 })}
                  value={filter.value}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, value: event.target.value } : row,
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </div>
        <Button type="button" disabled>
          {t('preview')}
        </Button>
      </div>
    </>
  )
}
