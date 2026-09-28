import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { applyServerErrors, messageFor } from '@/api/errors'
import { resolveStorageLocation, storageLocationOptions } from '@/api/references'
import { moveLot } from '../api'

const schema = z.object({
  locationId: z.string().min(1, 'Bắt buộc'),
  note: z.string().max(1000),
})
type Form = z.infer<typeof schema>

export interface MoveLotTarget {
  id: string
  lotNo?: string | null
  warehouseId: string | null
}

/** A1 — đổi vị trí lưu trữ của một lô (trong cùng kho). */
export function MoveLotDialog({
  lot,
  open,
  onOpenChange,
}: {
  lot?: MoveLotTarget
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('inventory')
  const qc = useQueryClient()
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { locationId: '', note: '' },
  })
  useEffect(() => {
    if (open) form.reset({ locationId: '', note: '' })
  }, [open, form])
  const move = useMutation({
    mutationFn: (values: Form) => {
      if (!lot) throw new Error('missing lot')
      return moveLot(lot.id, { locationId: values.locationId, note: values.note || undefined })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
      void qc.invalidateQueries({ queryKey: ['reference'] })
      toast.success(t('lotMoved'))
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
      title={t('moveLocation')}
      description={lot?.lotNo ? `${t('lot')} ${lot.lotNo}` : undefined}
      form={form}
      onSubmit={(values) => move.mutate(values)}
      submitting={move.isPending}
      width="md"
    >
      <FormField
        control={form.control}
        name="locationId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('location')}
              queryKey={`storage-locations-move-${lot?.warehouseId ?? 'none'}`}
              loadOptions={(q) => storageLocationOptions(lot?.warehouseId, q)}
              resolveOption={resolveStorageLocation}
              value={field.value || null}
              onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              disabled={!lot?.warehouseId}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="note" label={t('notes')} />
    </FormDialog>
  )
}
