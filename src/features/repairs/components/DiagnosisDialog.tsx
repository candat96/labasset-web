import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/components/form/FormDialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { AsyncSelect } from '@/components/form/async-select'
import { SelectField } from '@/components/form/fields'
import { FaultSuggestBox } from '@/components/fault-suggest-box'
import { catalogOptions, resolveCatalogItem } from '@/api/references'
import { applyServerErrors, messageFor } from '@/api/errors'
import * as api from '../api'
import { diagnosisSchema, type DiagnosisForm } from '../schema'
import { RESOLUTION_TYPES } from '../types'

/** Ô chẩn đoán dài bằng các ô mô tả khác trong hệ thống. */
const DIAGNOSIS_MAX = 2000

export function DiagnosisDialog({
  id,
  equipmentId,
  errorCode,
  description,
  defaultFaultId,
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  errorCode: string | null
  description: string
  defaultFaultId: string | null
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<DiagnosisForm>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosis: '',
      faultId: defaultFaultId,
      faultGroupId: null,
      resolutionType: null,
    },
  })
  const diagnosis = form.watch('diagnosis') ?? ''

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.diagnosis.title')}
      width="lg"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.patchDiagnosis(id, {
            diagnosis: values.diagnosis,
            faultId: values.faultId,
            faultGroupId: values.faultGroupId,
            resolutionType: values.resolutionType,
          })
          toast.success(t('detail.diagnosis.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      {/* Thứ tự theo yêu cầu: ô chẩn đoán → gợi ý xếp ngang → hai ô chọn thẳng hàng. */}
      <FormField
        control={form.control}
        name="diagnosis"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t('detail.diagnosis.label')}</FormLabel>
            <FormControl>
              <Textarea {...field} maxLength={DIAGNOSIS_MAX} rows={4} />
            </FormControl>
            <p className="text-muted-foreground text-right text-xs tabular-nums">
              {diagnosis.length}/{DIAGNOSIS_MAX}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FaultSuggestBox
        equipmentId={equipmentId}
        errorCode={errorCode ?? undefined}
        q={description}
        value={form.watch('faultId')}
        direction="row"
        onSelect={(fault) => {
          form.setValue('faultId', fault.id)
          // Điền sẵn khi ô còn trống; đã gõ rồi thì KHÔNG đè — chữ người dùng vừa
          // gõ quý hơn nội dung mẫu, mất chữ vì một cú bấm là thứ khó tha thứ.
          if (form.getValues('diagnosis')?.trim()) return
          form.setValue(
            'diagnosis',
            [fault.title, ...(fault.steps ?? [])]
              .filter(Boolean)
              .join('\n')
              .slice(0, DIAGNOSIS_MAX),
            { shouldDirty: true },
          )
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="faultGroupId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('detail.diagnosis.faultGroup')}
                queryKey="fault-groups"
                loadOptions={(q) => catalogOptions('fault-groups', q)}
                resolveOption={(id) => resolveCatalogItem('fault-groups', id)}
                value={field.value}
                onChange={field.onChange}
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <SelectField
          control={form.control}
          name="resolutionType"
          label={t('detail.diagnosis.resolutionType')}
          emptyLabel={t('detail.diagnosis.empty')}
          options={RESOLUTION_TYPES.map((item) => ({
            value: item,
            label: t(`detail.resolution.${item}`),
          }))}
        />
      </div>
    </FormDialog>
  )
}
