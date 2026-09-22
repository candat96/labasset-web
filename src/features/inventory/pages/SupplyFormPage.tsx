import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { ErrorState } from '@/components/page/ErrorState'
import { Form } from '@/components/ui/form'
import { TextField, SwitchField } from '@/components/form/fields'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, resolveCatalogItem } from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupply, getSupply, updateSupply } from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z.object({
  // Mã không bắt buộc — để trống server tự sinh (handoff 16).
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z.union([
        z.literal(''),
        z.string().regex(/^[A-Z0-9_-]{1,32}$/, i18n.t('inventory:codeInvalid')),
      ]),
    ),
  name: z.string().trim().min(1, i18n.t('common:form.required')),
  groupId: z.string().nullable(),
  unitId: z.string().min(1, i18n.t('common:form.required')),
  packaging: z.string(),
  manufacturerCode: z.string(),
  manufacturerId: z.string().nullable(),
  defaultSupplierId: z.string().nullable(),
  refPrice: decimalString({ maxScale: 0, min: '0' }),
  trackLot: z.boolean(),
  trackExpiry: z.boolean(),
  minStock: decimalString({ maxScale: 3, min: '0' }),
  maxStock: decimalString({ maxScale: 3, min: '0' }),
  openVialDays: z
    .string()
    .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) > 0), {
      message: i18n.t('common:form.invalid'),
    }),
  storageCondition: z.string(),
  isActive: z.boolean(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>
const empty: FormValues = {
  code: '',
  name: '',
  groupId: null,
  unitId: '',
  packaging: '',
  manufacturerCode: '',
  manufacturerId: null,
  defaultSupplierId: null,
  refPrice: '',
  trackLot: false,
  trackExpiry: false,
  minStock: '',
  maxStock: '',
  openVialDays: '',
  storageCondition: '',
  isActive: true,
  notes: '',
}

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['supplies', id],
    queryFn: () => getSupply(id),
    enabled: editing,
  })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })
  const trackLot = form.watch('trackLot')
  useEffect(() => {
    if (!trackLot) form.setValue('trackExpiry', false)
  }, [form, trackLot])
  useEffect(() => {
    if (!detail.data) return
    form.reset({
      code: detail.data.code,
      name: detail.data.name,
      groupId: detail.data.groupId,
      unitId: detail.data.unitId ?? '',
      packaging: detail.data.packaging ?? '',
      manufacturerCode: detail.data.manufacturerCode ?? '',
      manufacturerId: detail.data.manufacturerId,
      defaultSupplierId: detail.data.defaultSupplierId,
      refPrice: detail.data.refPrice ?? '',
      trackLot: detail.data.trackLot,
      trackExpiry: detail.data.trackExpiry,
      minStock: detail.data.minStock ?? '',
      maxStock: detail.data.maxStock ?? '',
      openVialDays: detail.data.openVialDays == null ? '' : String(detail.data.openVialDays),
      storageCondition: detail.data.storageCondition ?? '',
      isActive: detail.data.isActive,
      notes: detail.data.notes ?? '',
    })
  }, [detail.data, form])
  if (editing && detail.isPending) return <DetailSkeleton label={t('loadingSupply')} />
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: FormValues) => {
    const body = {
      ...values,
      code: values.code.toUpperCase() || undefined,
      packaging: values.packaging || null,
      manufacturerCode: values.manufacturerCode || null,
      defaultSupplierId: values.defaultSupplierId,
      refPrice: values.refPrice || null,
      minStock: values.minStock || null,
      maxStock: values.maxStock || null,
      openVialDays: values.openVialDays ? Number(values.openVialDays) : null,
      storageCondition: values.storageCondition || null,
      notes: values.notes || null,
    }
    try {
      if (editing) {
        await updateSupply(id, body)
        toast.success(t('supplySaved'))
        void qc.invalidateQueries({ queryKey: ['supplies'] })
        navigate(`/supplies/${id}`)
      } else {
        const created = await createSupply(body)
        toast.success(t('supplyCreatedWithCode', { code: created.code }))
        void qc.invalidateQueries({ queryKey: ['supplies'] })
        navigate(`/supplies/${created.id}`)
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={t('suppliesTitle')}
        title={editing ? t('editSupply') : t('createSupply')}
        description={t('supplyFormHint', {
          defaultValue: 'Mã, tên, quy cách và cấu hình theo dõi lô/hạn, tồn tối thiểu – tối đa.',
        })}
      />
      <Form {...form}>
        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard title={t('info', { defaultValue: 'Thông tin chung' })}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                control={form.control}
                name="code"
                label={t('code')}
                placeholder={t('codeAutoExample', { example: 'VT-00001' })}
                transform={(v) => v.toUpperCase()}
              />
              <TextField control={form.control} name="name" label={t('name')} />
              <TextField control={form.control} name="packaging" label={t('packaging')} />
              <TextField
                control={form.control}
                name="manufacturerCode"
                label={t('manufacturerCode')}
              />
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('group')}
                      queryKey="supply-groups"
                      loadOptions={(q) => catalogOptions('supply-groups', q)}
                      resolveOption={(groupId) => resolveCatalogItem('supply-groups', groupId)}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('unit')}
                      queryKey="units"
                      loadOptions={(q) => catalogOptions('units', q)}
                      resolveOption={(unitId) => resolveCatalogItem('units', unitId)}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturerId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('manufacturer')}
                      queryKey="manufacturers"
                      loadOptions={(q) => catalogOptions('manufacturers', q)}
                      resolveOption={(value) => resolveCatalogItem('manufacturers', value)}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultSupplierId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('defaultSupplier')}
                      queryKey="suppliers"
                      loadOptions={(q) => catalogOptions('suppliers', q)}
                      resolveOption={(value) => resolveCatalogItem('suppliers', value)}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('stockSettings', { defaultValue: 'Tồn kho & theo dõi' })}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MoneyField control={form.control} name="refPrice" label={t('refPrice')} />
              <SwitchField control={form.control} name="trackLot" label={t('trackLotField')} />
              <SwitchField
                control={form.control}
                name="trackExpiry"
                label={t('trackExpiry')}
                disabled={!trackLot}
              />
              <QtyField control={form.control} name="minStock" label={t('minStock')} />
              <QtyField control={form.control} name="maxStock" label={t('maxStock')} />
              <TextField
                control={form.control}
                name="openVialDays"
                label={t('openVialDays')}
                type="number"
              />
              <TextField
                control={form.control}
                name="storageCondition"
                label={t('storageCondition')}
              />
              <SwitchField control={form.control} name="isActive" label={t('isActive')} />
              <TextField control={form.control} name="notes" label={t('notes')} />
            </div>
          </SectionCard>
          <FormFooter
            onCancel={() => navigate(-1)}
            submitting={form.formState.isSubmitting}
            saveLabel={t('save')}
          />
        </form>
      </Form>
    </>
  )
}
