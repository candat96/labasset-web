import { useEffect } from 'react'
import { useForm, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form/FormDialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, messageFor } from '@/api/errors'
import { createSupplierEvaluation, updateSupplierEvaluation } from '../api'
import { evaluationSchema, type EvaluationForm } from '../schema'
import { EVALUATION_SCORES, type SupplierEvaluation, type SupplierEvaluationInput } from '../types'
import { EvaluationFactsPanel } from './EvaluationFactsPanel'

function monthDefaults(): { periodFrom: string; periodTo: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { periodFrom: iso(first), periodTo: iso(now) }
}

function initial(row?: SupplierEvaluation): EvaluationForm {
  if (row)
    return {
      periodFrom: row.periodFrom,
      periodTo: row.periodTo,
      deliveryScore: row.deliveryScore,
      qualityScore: row.qualityScore,
      documentScore: row.documentScore,
      supportScore: row.supportScore,
      note: row.note ?? '',
    }
  return {
    ...monthDefaults(),
    deliveryScore: 5,
    qualityScore: 5,
    documentScore: 5,
    supportScore: 5,
    note: '',
  }
}

/** Ô chấm điểm 0–10: thanh trượt + ô số, đồng bộ hai chiều. */
function ScoreField({
  control,
  name,
  label,
}: {
  control: Control<EvaluationForm>
  name: (typeof EVALUATION_SCORES)[number]
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = Number(field.value)
        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{label}</FormLabel>
              <output className="text-sm font-semibold tabular-nums">{value.toFixed(1)}</output>
            </div>
            <FormControl>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={value}
                  aria-label={label}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  className="accent-primary h-2 flex-1 cursor-pointer"
                />
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={Number.isFinite(value) ? value : ''}
                  aria-label={label}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  className="w-20"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function EvaluationFormDialog({
  supplierId,
  row,
  open,
  onOpenChange,
}: {
  supplierId: string
  row?: SupplierEvaluation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('suppliers')
  const form = useForm<EvaluationForm>({
    resolver: zodResolver(evaluationSchema) as Resolver<EvaluationForm>,
    defaultValues: initial(row),
    mode: 'onBlur',
  })
  const queryClient = useQueryClient()
  useEffect(() => {
    if (open) form.reset(initial(row))
  }, [open, row, form])
  const periodFrom = form.watch('periodFrom')
  const periodTo = form.watch('periodTo')

  const save = useMutation({
    mutationFn: (values: EvaluationForm) => {
      const body: SupplierEvaluationInput = {
        periodFrom: values.periodFrom,
        periodTo: values.periodTo,
        deliveryScore: values.deliveryScore,
        qualityScore: values.qualityScore,
        documentScore: values.documentScore,
        supportScore: values.supportScore,
        note: values.note?.trim() ? values.note : null,
      }
      return row
        ? updateSupplierEvaluation(supplierId, row.id, body)
        : createSupplierEvaluation(supplierId, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier-evaluations', supplierId] })
      void queryClient.invalidateQueries({ queryKey: ['catalogs', 'suppliers'] })
      toast.success(t('saved'))
      onOpenChange(false)
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? t('editEvaluation') : t('addEvaluation')}
      description={t('evaluationsHint')}
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width="xl"
    >
      <div className="grid gap-5 sm:col-span-full lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="periodFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('periodFrom')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="periodTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('periodTo')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-[12.5px] sm:col-span-2">{t('scores.hint')}</p>
          {EVALUATION_SCORES.map((name) => (
            <ScoreField key={name} control={form.control} name={name} label={t(`scores.${name}`)} />
          ))}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('note')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder={t('notePlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-[12.5px] sm:col-span-2">{t('totalHint')}</p>
        </div>
        <EvaluationFactsPanel supplierId={supplierId} from={periodFrom} to={periodTo} />
      </div>
    </FormDialog>
  )
}
