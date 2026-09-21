import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { Form } from '@/components/ui/form'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { TextField, SelectField, SwitchField } from '@/components/form/fields'
import { FormControl, FormLabel } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { AsyncSelect } from '@/components/form/async-select'
import { FaultSuggestBox } from '@/components/fault-suggest-box'
import { applyServerErrors, messageFor } from '@/api/errors'
import { departmentOptions, equipmentOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { faultSeverityMap } from '@/lib/status-maps'
import { createRepair } from '../api'
import { usePublicRepairSettings } from '../hooks'
import { repairCreateSchema, type RepairCreateForm } from '../schema'
import { REPAIR_SEVERITIES } from '../types'

export function Component() {
  const { t } = useTranslation('repairs')
  const navigate = useNavigate()
  const canPickDept = useCan(STAFF)
  const settings = usePublicRepairSettings()
  const form = useForm<RepairCreateForm>({
    resolver: zodResolver(repairCreateSchema),
    defaultValues: {
      equipmentId: '',
      description: '',
      errorCode: '',
      severity: 'medium',
      equipmentDown: false,
      reportedDepartmentId: null,
      faultId: null,
    },
  })
  const equipmentId = form.watch('equipmentId')
  const errorCode = form.watch('errorCode')
  const description = form.watch('description')
  const severity = form.watch('severity')
  const sla = settings.data?.['repair.sla']
  const slaHours =
    sla && typeof sla === 'object' && sla !== null
      ? Number((sla as Record<string, unknown>)[severity])
      : undefined
  const submit = async (values: RepairCreateForm) => {
    try {
      const created = await createRepair({
        equipmentId: values.equipmentId,
        description: values.description,
        errorCode: values.errorCode || undefined,
        severity: values.severity,
        equipmentDown: values.equipmentDown,
        reportedDepartmentId: canPickDept ? (values.reportedDepartmentId ?? undefined) : undefined,
      })
      toast.success(t('form.created'))
      navigate(`/repairs/${created.id}`, { state: { faultId: values.faultId } })
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={t('title', { defaultValue: 'Phiếu sửa chữa' })}
        title={t('form.title')}
        description={t('form.hint', {
          defaultValue: 'Chọn máy, mô tả sự cố và mức độ; hệ thống gợi ý lỗi tương tự bên phải.',
        })}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Form {...form}>
          <form className="min-w-0 space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
            <SectionCard title={t('form.info', { defaultValue: 'Thông tin sự cố' })}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="equipmentId"
                  render={({ field }) => (
                    <FormItem>
                      <AsyncSelect
                        label={t('form.equipment')}
                        queryKey="equipment"
                        loadOptions={equipmentOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('form.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TextField control={form.control} name="errorCode" label={t('form.errorCode')} />
                <SelectField
                  control={form.control}
                  name="severity"
                  label={t('form.severity')}
                  options={REPAIR_SEVERITIES.map((item) => ({
                    value: item,
                    label: faultSeverityMap[item]?.label ?? item,
                  }))}
                />
                <p className="text-muted-foreground text-[13px] md:col-span-2">
                  {Number.isFinite(slaHours)
                    ? t('form.sla', { hours: slaHours })
                    : t('form.slaHint')}
                </p>
                <SwitchField
                  control={form.control}
                  name="equipmentDown"
                  label={t('form.equipmentDown')}
                />
                {canPickDept && (
                  <FormField
                    control={form.control}
                    name="reportedDepartmentId"
                    render={({ field }) => (
                      <FormItem>
                        <AsyncSelect
                          label={t('form.reportedDepartment')}
                          queryKey="departments"
                          loadOptions={departmentOptions}
                          value={field.value}
                          onChange={field.onChange}
                          clearable
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </SectionCard>
            <FormFooter
              onCancel={() => navigate(-1)}
              submitting={form.formState.isSubmitting}
              saveLabel={t('form.create')}
            />
          </form>
        </Form>
        <SectionCard
          title={t('form.suggestions')}
          className="lg:sticky lg:top-[72px] lg:self-start"
        >
          <FaultSuggestBox
            equipmentId={equipmentId || undefined}
            errorCode={errorCode || undefined}
            q={description || undefined}
            value={form.watch('faultId')}
            onSelect={(id) => form.setValue('faultId', id)}
          />
        </SectionCard>
      </div>
    </>
  )
}
