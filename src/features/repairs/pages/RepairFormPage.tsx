import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
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
  const { t: tc } = useTranslation()
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
      <PageHeader title={t('form.title')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Form {...form}>
          <form className="max-w-xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
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
                <FormItem>
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
            <p className="text-muted-foreground -mt-2 text-sm">
              {Number.isFinite(slaHours) ? t('form.sla', { hours: slaHours }) : t('form.slaHint')}
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit">{t('form.create')}</Button>
            </div>
          </form>
        </Form>
        <aside className="rounded-lg border p-3">
          <h2 className="mb-2 font-medium">{t('form.suggestions')}</h2>
          <FaultSuggestBox
            equipmentId={equipmentId || undefined}
            errorCode={errorCode || undefined}
            q={description || undefined}
            value={form.watch('faultId')}
            onSelect={(id) => form.setValue('faultId', id)}
          />
        </aside>
      </div>
    </>
  )
}
