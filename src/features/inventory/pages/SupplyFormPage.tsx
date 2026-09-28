import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { toast } from 'sonner'
import { SectionCard } from '@/components/page/SectionCard'
import { PageHeader } from '@/components/page/PageHeader'
import { FormFooter } from '@/components/page/FormFooter'
import { ErrorState } from '@/components/page/ErrorState'
import { TextField, SwitchField, SelectField } from '@/components/form/fields'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { DateField } from '@/components/form/date-field'
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form'
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
  // Hồ sơ vật tư tiêu hao chi tiết. Mọi trường để trống được (nullable).
  circulationNumber: z.string().max(64),
  circulationValidTo: z.string(),
  riskClass: z.string().nullable(),
  countryOfOrigin: z.string().max(100),
  insuranceCode: z.string().max(64),
  insuranceName: z.string().max(255),
  insuranceRate: decimalString({ maxScale: 2, min: '0' }).refine(
    (value) => value === '' || Number(value) <= 100,
    i18n.t('inventory:insuranceRateInvalid'),
  ),
  insurancePrice: decimalString({ maxScale: 0, min: '0' }),
  bidPackage: z.string().max(255),
  bidDecisionNo: z.string().max(128),
  bidPrice: decimalString({ maxScale: 0, min: '0' }),
  bidValidTo: z.string(),
  purchaseUnitId: z.string().nullable(),
  conversionFactor: decimalString({ maxScale: 4, min: '0' }).refine((value) => {
    if (value === '') return true
    try {
      // Hệ số phải > 0: `0` và số âm bị chặn với mã CONVERSION_FACTOR_INVALID.
      return new Big(value).gt(0)
    } catch {
      return false
    }
  }, i18n.t('inventory:conversionFactorInvalid')),
  minShelfLifeDays: z
    .string()
    .refine(
      (value) =>
        value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 3650),
      i18n.t('inventory:minShelfLifeInvalid'),
    ),
  countCycleDays: z
    .string()
    .refine(
      (value) =>
        value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 365),
      i18n.t('inventory:countCycleInvalid'),
    ),
  leadTimeDays: z
    .string()
    .refine(
      (value) =>
        value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 365),
      i18n.t('inventory:leadTimeInvalid'),
    ),
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
  circulationNumber: '',
  circulationValidTo: '',
  riskClass: null,
  countryOfOrigin: '',
  insuranceCode: '',
  insuranceName: '',
  insuranceRate: '',
  insurancePrice: '',
  bidPackage: '',
  bidDecisionNo: '',
  bidPrice: '',
  bidValidTo: '',
  purchaseUnitId: null,
  conversionFactor: '',
  minShelfLifeDays: '',
  countCycleDays: '',
  leadTimeDays: '',
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
  const purchaseUnitId = form.watch('purchaseUnitId')
  const usageUnitId = form.watch('unitId')
  const conversionFactor = form.watch('conversionFactor')
  // Danh mục đơn vị để diễn giải "1 Thùng = 100 Cái" ngay dưới ô hệ số.
  const units = useQuery({
    queryKey: ['reference', 'units', ''],
    queryFn: () => catalogOptions('units', ''),
  })
  const unitName = (unitId: string | null) =>
    units.data?.find((unit) => unit.id === unitId)?.name ?? null
  const purchaseUnitName = unitName(purchaseUnitId)
  const usageUnitName = unitName(usageUnitId || null)
  const showConversion = !!(purchaseUnitName && usageUnitName && conversionFactor)
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
      circulationNumber: detail.data.circulationNumber ?? '',
      circulationValidTo: detail.data.circulationValidTo ?? '',
      riskClass: detail.data.riskClass,
      countryOfOrigin: detail.data.countryOfOrigin ?? '',
      insuranceCode: detail.data.insuranceCode ?? '',
      insuranceName: detail.data.insuranceName ?? '',
      insuranceRate: detail.data.insuranceRate ?? '',
      insurancePrice: detail.data.insurancePrice ?? '',
      bidPackage: detail.data.bidPackage ?? '',
      bidDecisionNo: detail.data.bidDecisionNo ?? '',
      bidPrice: detail.data.bidPrice ?? '',
      bidValidTo: detail.data.bidValidTo ?? '',
      purchaseUnitId: detail.data.purchaseUnitId,
      conversionFactor: detail.data.conversionFactor ?? '',
      minShelfLifeDays:
        detail.data.minShelfLifeDays == null ? '' : String(detail.data.minShelfLifeDays),
      countCycleDays: detail.data.countCycleDays == null ? '' : String(detail.data.countCycleDays),
      leadTimeDays: detail.data.leadTimeDays == null ? '' : String(detail.data.leadTimeDays),
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
      circulationNumber: values.circulationNumber || null,
      circulationValidTo: values.circulationValidTo || null,
      riskClass: values.riskClass || null,
      countryOfOrigin: values.countryOfOrigin || null,
      insuranceCode: values.insuranceCode || null,
      insuranceName: values.insuranceName || null,
      insuranceRate: values.insuranceRate || null,
      insurancePrice: values.insurancePrice || null,
      bidPackage: values.bidPackage || null,
      bidDecisionNo: values.bidDecisionNo || null,
      bidPrice: values.bidPrice || null,
      bidValidTo: values.bidValidTo || null,
      purchaseUnitId: values.purchaseUnitId,
      conversionFactor: values.conversionFactor || null,
      minShelfLifeDays: values.minShelfLifeDays ? Number(values.minShelfLifeDays) : null,
      countCycleDays: values.countCycleDays ? Number(values.countCycleDays) : null,
      leadTimeDays: values.leadTimeDays ? Number(values.leadTimeDays) : null,
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
  const riskOptions = [
    { value: 'A', label: t('riskClassA') },
    { value: 'B', label: t('riskClassB') },
    { value: 'C', label: t('riskClassC') },
    { value: 'D', label: t('riskClassD') },
  ]
  return (
    <>
      <PageHeader
        title={editing ? t('editSupply') : t('createSupply')}
        description={t('supplyFormHint')}
      />
      <Form {...form}>
        <form className="space-y-3" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard title={t('info')}>
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
                name="leadTimeDays"
                label={t('leadTimeDays')}
                type="number"
                inputMode="numeric"
                description={t('leadTimeDaysHint')}
              />
              <SwitchField control={form.control} name="isActive" label={t('isActive')} />
            </div>
          </SectionCard>
          <SectionCard title={t('legalSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                control={form.control}
                name="circulationNumber"
                label={t('circulationNumber')}
              />
              <DateField
                control={form.control}
                name="circulationValidTo"
                label={t('circulationValidTo')}
              />
              <SelectField
                control={form.control}
                name="riskClass"
                label={t('riskClass')}
                options={riskOptions}
                emptyLabel={t('notSelected')}
              />
              <TextField
                control={form.control}
                name="countryOfOrigin"
                label={t('countryOfOrigin')}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('insuranceSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField control={form.control} name="insuranceCode" label={t('insuranceCode')} />
              <TextField control={form.control} name="insuranceName" label={t('insuranceName')} />
              <TextField
                control={form.control}
                name="insuranceRate"
                label={t('insuranceRate')}
                inputMode="decimal"
              />
              <MoneyField
                control={form.control}
                name="insurancePrice"
                label={t('insurancePrice')}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('bidSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField control={form.control} name="bidPackage" label={t('bidPackage')} />
              <TextField control={form.control} name="bidDecisionNo" label={t('bidDecisionNo')} />
              <MoneyField control={form.control} name="bidPrice" label={t('bidPrice')} />
              <DateField control={form.control} name="bidValidTo" label={t('bidValidTo')} />
            </div>
          </SectionCard>
          <SectionCard title={t('conversionSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField
                control={form.control}
                name="purchaseUnitId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('purchaseUnit')}
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
              <div>
                <TextField
                  control={form.control}
                  name="conversionFactor"
                  label={t('conversionFactor')}
                  inputMode="decimal"
                  placeholder={t('conversionFactorHint')}
                />
                {showConversion && (
                  <p
                    className="text-muted-foreground mt-1.5 text-[13px]"
                    data-testid="conversion-preview"
                  >
                    {t('conversionPreview', {
                      purchaseUnit: purchaseUnitName,
                      factor: conversionFactor,
                      unit: usageUnitName,
                    })}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
          <SectionCard title={t('shelfLifeSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <TextField
                control={form.control}
                name="minShelfLifeDays"
                label={t('minShelfLifeDays')}
                type="number"
              />
              <TextField
                control={form.control}
                name="countCycleDays"
                label={t('countCycleDays')}
                type="number"
                inputMode="numeric"
                description={t('countCycleDaysHint')}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('notesSection')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
