import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useFormContext, useWatch, type Control, type FieldPath } from 'react-hook-form'
import { format, subDays } from 'date-fns'
import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import {
  catalogOptions,
  departmentOptions,
  equipmentOptions,
  supplyOptions,
  type Reference,
} from '@/api/references'
import { AsyncSelect } from '@/components/form/async-select'
import { DateField } from '@/components/form/date-field'
import {
  FieldGrid,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
} from '@/components/form/fields'
import { Form } from '@/components/ui/form'
import i18n from '@/lib/i18n'
import type { JsonObjectSchema, JsonSchemaProperty, ReportParamValues } from './api'

export type SchemaFieldKind = 'date' | 'uuid' | 'enum' | 'boolean' | 'number' | 'string'

export interface SchemaParamsFormHandle {
  getValues: () => ReportParamValues
}

export interface SchemaParamsFormProps {
  schema: JsonObjectSchema
  fieldErrors?: Record<string, string>
  onChange?: (value: ReportParamValues) => void
}

/** Khoá i18n `reports` cho nhãn tham số mặc định (fallback khi schema API thiếu `title`). */
const DEFAULT_LABEL_KEYS: Record<string, string> = {
  from: 'paramFrom',
  to: 'paramTo',
  q: 'paramQ',
  status: 'paramStatus',
  departmentId: 'paramDepartment',
  warehouseId: 'paramWarehouse',
  equipmentId: 'paramEquipment',
  supplyId: 'paramSupply',
  sessionId: 'paramSession',
  groupBy: 'paramGroupBy',
  minCost: 'paramMinCost',
  includeRetired: 'paramIncludeRetired',
  onlyBelowMin: 'paramOnlyBelowMin',
  includeZero: 'paramIncludeZero',
  minAbsDiff: 'paramMinAbsDiff',
}

const ENUM_LABEL_KEYS: Record<string, string> = {
  active: 'enumActive',
  broken: 'enumBroken',
  awaiting_parts: 'enumAwaitingParts',
  retired: 'enumRetired',
  equipment: 'enumByEquipment',
  department: 'enumByDepartment',
  month: 'enumByMonth',
}

const XREF_KEYS = ['departmentId', 'warehouseId', 'equipmentId', 'supplyId', 'sessionId'] as const

async function sessionOptions(q: string): Promise<Reference[]> {
  const result = await unwrapAs<{ items?: { id: string; code?: string; name?: string }[] }>(
    api.GET('/v1/stocktakes', { params: { query: pageQuery({ q, page: 1, limit: 50 }) } }),
  )
  return (result.items ?? []).map((row) => ({
    id: row.id,
    code: row.code ?? row.id,
    name: row.name ?? row.code ?? row.id,
  }))
}

const REF_LOADERS: Record<string, (q: string) => Promise<Reference[]>> = {
  departmentId: departmentOptions,
  warehouseId: (q) => catalogOptions('warehouses', q),
  equipmentId: equipmentOptions,
  supplyId: supplyOptions,
  sessionId: sessionOptions,
}

export function last30DayRange() {
  return {
    from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }
}

export function fieldKind(property: JsonSchemaProperty): SchemaFieldKind {
  if (property.format === 'date') return 'date'
  if (property.format === 'uuid' || property['x-ref']) return 'uuid'
  if (property.enum && property.enum.length > 0) return 'enum'
  if (property.type === 'boolean') return 'boolean'
  if (property.type === 'number' || property.type === 'integer') return 'number'
  return 'string'
}

export function schemaProperties(schema: JsonObjectSchema): [string, JsonSchemaProperty][] {
  return Object.entries(schema.properties ?? {})
}

export function fieldLabel(name: string, property: JsonSchemaProperty): string {
  const key = DEFAULT_LABEL_KEYS[name]
  if (property.title) return property.title
  return key ? i18n.t(`reports:${key}`) : name
}

function enumLabelKey(value: string): string | undefined {
  return ENUM_LABEL_KEYS[value]
}

export function asObjectSchema(params: JsonObjectSchema | Record<string, unknown> | undefined) {
  if (!params || typeof params !== 'object') return { type: 'object' as const, properties: {} }
  if ('properties' in params || params.type === 'object') return params as JsonObjectSchema
  return { type: 'object' as const, properties: {} }
}

export function defaultParamsFromSchema(schema: JsonObjectSchema): ReportParamValues {
  const range = last30DayRange()
  const values: ReportParamValues = {}
  for (const [name, property] of schemaProperties(schema)) {
    if (property.default !== undefined && property.default !== null) {
      values[name] = property.default
      continue
    }
    const kind = fieldKind(property)
    if (name === 'from') values.from = range.from
    else if (name === 'to') values.to = range.to
    else if (kind === 'boolean') values[name] = false
    else if (kind === 'uuid') values[name] = null
    else values[name] = ''
  }
  return values
}

function xrefOf(name: string, property: JsonSchemaProperty): string | undefined {
  if (property['x-ref']) return property['x-ref']
  return (XREF_KEYS as readonly string[]).includes(name) ? name : undefined
}

function UuidField({
  name,
  label,
  control,
  loadOptions,
}: {
  name: string
  label: string
  control: Control<ReportParamValues>
  loadOptions: (q: string) => Promise<Reference[]>
}) {
  const { setValue } = useFormContext<ReportParamValues>()
  const path = name as FieldPath<ReportParamValues>
  const raw = useWatch({ control, name: path })
  const value = typeof raw === 'string' && raw ? raw : null
  return (
    <AsyncSelect
      label={label}
      queryKey={`report-${name}`}
      loadOptions={loadOptions}
      value={value}
      onChange={(next) => {
        const id = Array.isArray(next) ? (next[0] ?? null) : next
        setValue(path, id, { shouldDirty: true, shouldTouch: true })
      }}
      clearable
    />
  )
}

export function SchemaField({
  name,
  property,
  control,
  required,
}: {
  name: string
  property: JsonSchemaProperty
  control: Control<ReportParamValues>
  required?: boolean
}) {
  const { t } = useTranslation('reports')
  const label = fieldLabel(name, property)
  const kind = fieldKind(property)
  const path = name as FieldPath<ReportParamValues>
  if (kind === 'date') return <DateField control={control} name={path} label={label} />
  if (kind === 'boolean') return <SwitchField control={control} name={path} label={label} />
  if (kind === 'number') return <NumberField control={control} name={path} label={label} />
  if (kind === 'enum') {
    return (
      <SelectField
        control={control}
        name={path}
        label={label}
        placeholder={t('selectPlaceholder')}
        emptyLabel={required ? undefined : t('allOption')}
        options={(property.enum ?? []).map((value) => {
          const key = enumLabelKey(value)
          return { value, label: key ? t(key) : value }
        })}
      />
    )
  }
  if (kind === 'uuid') {
    const ref = xrefOf(name, property)
    const loadOptions = ref ? REF_LOADERS[ref] : undefined
    if (loadOptions) {
      return <UuidField name={name} label={label} control={control} loadOptions={loadOptions} />
    }
  }
  return <TextField control={control} name={path} label={label} />
}

export const SchemaParamsForm = forwardRef<SchemaParamsFormHandle, SchemaParamsFormProps>(
  function SchemaParamsForm({ schema, fieldErrors, onChange }, ref) {
    const defaults = useMemo(() => defaultParamsFromSchema(schema), [schema])
    const form = useForm<ReportParamValues>({ defaultValues: defaults })
    const required = new Set(schema.required ?? [])

    useImperativeHandle(ref, () => ({ getValues: () => form.getValues() }))

    useEffect(() => {
      onChange?.(form.getValues())
      const sub = form.watch((value) => onChange?.(value as ReportParamValues))
      return () => sub.unsubscribe()
    }, [form, onChange])

    useEffect(() => {
      form.clearErrors()
      if (!fieldErrors) return
      for (const [name, message] of Object.entries(fieldErrors)) {
        form.setError(name as FieldPath<ReportParamValues>, { type: 'server', message })
      }
    }, [fieldErrors, form])

    return (
      <Form {...form}>
        <FieldGrid>
          {schemaProperties(schema).map(([name, property]) => (
            <SchemaField
              key={name}
              name={name}
              property={property}
              control={form.control}
              required={required.has(name)}
            />
          ))}
        </FieldGrid>
      </Form>
    )
  },
)
