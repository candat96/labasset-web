import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { toast } from 'sonner'
import { CircleAlert } from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { PageHeader } from '@/components/page/PageHeader'
import { FormFooter } from '@/components/page/FormFooter'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { formatQty } from '@/lib/format/number'
import { formatDate } from '@/lib/format/date'
import { formatVnd, moneyAdd, moneyMul } from '@/lib/format/money'
import { decimalString } from '@/lib/validation/decimal'
import { cn } from '@/lib/utils'
import { createReceipt, getReceipt, getSupply, updateReceipt } from '../api'
import type { Supply } from '../types'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z.object({
  type: z.enum(['purchase', 'return_from_dept', 'adjust_in']),
  warehouseId: z.string().min(1, i18n.t('common:form.required')),
  supplierId: z.string().nullable(),
  fromDepartmentId: z.string().nullable(),
  invoiceNo: z.string(),
  invoiceDate: z.string(),
  receivedAt: z.string(),
  qcStatus: z.enum(['pending', 'passed', 'failed']),
  qcNote: z.string(),
  notes: z.string(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1, i18n.t('common:form.required')),
        lotNo: z.string(),
        expiresAt: z.string(),
        // Một dòng chỉ dùng một trong hai ô số lượng; chế độ nhập quyết định gửi ô nào.
        quantity: decimalString({ maxScale: 3, min: '0' }),
        purchaseQuantity: decimalString({ maxScale: 3, min: '0' }),
        purchaseUnit: z.boolean(),
        unitCost: decimalString({ maxScale: 0, min: '0' }),
      }),
    )
    .min(1),
})
type FormValues = z.infer<typeof schema>

/**
 * Quy đổi số lượng theo đơn vị mua sang đơn vị dùng, khớp cách backend làm tròn
 * (nhân số nguyên thang 10^4 rồi nửa lên, giữ numeric(14,3)).
 */
function convertPurchaseQuantity(purchaseQuantity: string, conversionFactor: string): string {
  try {
    return new Big(purchaseQuantity).times(conversionFactor).toFixed(3)
  } catch {
    return ''
  }
}

/** Giá thầu còn hiệu lực (hoặc không ghi hạn) → giá trúng thầu, ngược lại → giá tham chiếu. */
function defaultUnitCost(supply: Supply): string {
  const bidValid = !supply.bidValidTo || new Date(supply.bidValidTo).getTime() >= Date.now()
  if (bidValid && supply.bidPrice) return supply.bidPrice
  return supply.refPrice ?? ''
}

/** Số lưu hành đã quá hạn — cảnh báo trong form, không chặn lưu. */
function circulationExpired(supply: Supply): boolean {
  if (!supply.circulationValidTo) return false
  return new Date(supply.circulationValidTo).getTime() < Date.now()
}

/** Công tắc chọn đơn vị nhập cho một dòng: đơn vị dùng ↔ đơn vị mua. */
function UnitModeToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  const { t } = useTranslation('inventory')
  const option = (active: boolean) =>
    cn(
      'h-full rounded-[5px] px-3.5 text-[13px] font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
    )
  return (
    <div
      role="group"
      aria-label={t('unitMode')}
      className="border-border bg-card inline-flex h-11 items-stretch rounded-md border p-0.5"
    >
      <button
        type="button"
        aria-pressed={!value}
        className={option(!value)}
        onClick={() => onChange(false)}
      >
        {t('unitUsage')}
      </button>
      <button
        type="button"
        aria-pressed={value}
        className={option(value)}
        onClick={() => onChange(true)}
      >
        {t('unitPurchase')}
      </button>
    </div>
  )
}

export function Component() {
  const { t } = useTranslation('inventory')

  const navigate = useNavigate()
  const { id = '' } = useParams()
  const editing = !!id
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: editing,
  })
  const [savedWarnings, setSavedWarnings] = useState<string[]>([])
  const [savedId, setSavedId] = useState('')
  // Dòng đã được áp giá mặc định theo vật tư nào — đổi vật tư mới ghi đè, gõ tay thì giữ.
  const appliedPrice = useRef<Record<number, string>>({})
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'purchase',
      warehouseId: '',
      supplierId: null,
      fromDepartmentId: null,
      invoiceNo: '',
      invoiceDate: '',
      receivedAt: new Date().toISOString().slice(0, 10),
      qcStatus: 'pending',
      qcNote: '',
      notes: '',
      items: [
        {
          supplyId: '',
          lotNo: '',
          expiresAt: '',
          quantity: '1',
          purchaseQuantity: '1',
          purchaseUnit: false,
          unitCost: '0',
        },
      ],
    },
  })
  useEffect(() => {
    const row = detail.data
    if (!row) return
    const stringValue = (value: unknown) => (typeof value === 'string' ? value : '')
    const loaded = row.items.map((item) => ({
      supplyId: item.supplyId,
      lotNo: item.lotNo ?? '',
      expiresAt: item.expiresAt ?? '',
      quantity: item.quantity ?? '',
      purchaseQuantity: item.purchaseQuantity ?? item.quantity ?? '',
      purchaseUnit: false,
      unitCost: item.unitCost,
    }))
    appliedPrice.current = {}
    loaded.forEach((item, index) => {
      appliedPrice.current[index] = item.supplyId
    })
    form.reset({
      type: row.type,
      warehouseId: row.warehouseId,
      supplierId: stringValue(row.supplierId) || null,
      fromDepartmentId: stringValue(row.fromDepartmentId) || null,
      invoiceNo: stringValue(row.invoiceNo),
      invoiceDate: stringValue(row.invoiceDate),
      receivedAt: row.receivedAt?.slice(0, 10) ?? '',
      qcStatus: row.qcStatus ?? 'pending',
      qcNote: stringValue(row.qcNote),
      notes: stringValue(row.notes),
      items: loaded,
    })
  }, [detail.data, form])
  const items = useFieldArray({ control: form.control, name: 'items' })
  const watched = form.watch('items')
  const units = useQuery({
    queryKey: ['reference', 'units', ''],
    queryFn: () => catalogOptions('units', ''),
  })
  const unitName = (unitId: string | null | undefined) =>
    unitId ? (units.data?.find((unit) => unit.id === unitId)?.name ?? null) : null
  const supplyIds = watched.map((item) => item?.supplyId ?? '')
  const supplyQueries = useQueries({
    queries: supplyIds.map((supplyId) => ({
      queryKey: ['supplies', supplyId],
      queryFn: () => getSupply(supplyId),
      enabled: !!supplyId,
    })),
  })
  const supplies: Array<Supply | null> = supplyQueries.map((query) => query.data ?? null)
  useEffect(() => {
    watched.forEach((item, index) => {
      const supply = supplies[index]
      if (!item?.supplyId || !supply) return
      const canPurchase = !!(supply.conversionFactor && supply.purchaseUnitId)
      if (item.purchaseUnit && !canPurchase) form.setValue(`items.${index}.purchaseUnit`, false)
      if (appliedPrice.current[index] === item.supplyId) return
      appliedPrice.current[index] = item.supplyId
      const price = defaultUnitCost(supply)
      if (price) form.setValue(`items.${index}.unitCost`, price, { shouldDirty: true })
    })
  }, [watched, supplies, form])
  /** Số lượng đơn vị dùng của dòng: ở chế độ đơn vị mua thì quy đổi trước. */
  const effectiveQty = (index: number): string => {
    const item = watched[index]
    const supply = supplies[index]
    if (item?.purchaseUnit && supply?.conversionFactor) {
      const converted = convertPurchaseQuantity(
        item.purchaseQuantity ?? '0',
        supply.conversionFactor,
      )
      return converted || '0'
    }
    return item?.quantity || '0'
  }
  const total = moneyAdd(
    watched.map((item, index) => moneyMul(effectiveQty(index), item?.unitCost || '0')),
  )
  const setUnitMode = (index: number, purchase: boolean) => {
    form.setValue(`items.${index}.purchaseUnit`, purchase)
    if (purchase) {
      if (!form.getValues(`items.${index}.purchaseQuantity`))
        form.setValue(`items.${index}.purchaseQuantity`, '1')
    } else if (!form.getValues(`items.${index}.quantity`)) {
      form.setValue(`items.${index}.quantity`, '1')
    }
  }
  const submit = async (values: FormValues) => {
    if (values.type === 'purchase' && !values.supplierId) {
      form.setError('supplierId', { message: t('requiredSupplier') })
      return
    }
    if (values.type === 'return_from_dept' && !values.fromDepartmentId) {
      form.setError('fromDepartmentId', { message: t('requiredDepartment') })
      return
    }
    const supplies = await Promise.all(values.items.map((item) => getSupply(item.supplyId)))
    let invalidTracking = false
    supplies.forEach((supply, index) => {
      const item = values.items[index]
      if (!item) return
      if (supply.trackLot && !item.lotNo) {
        form.setError(`items.${index}.lotNo`, { message: t('requiredLot') })
        invalidTracking = true
      }
      if (supply.trackExpiry && !item.expiresAt) {
        form.setError(`items.${index}.expiresAt`, { message: t('requiredExpiry') })
        invalidTracking = true
      }
    })
    if (invalidTracking) return
    try {
      const body = apiBody({
        type: values.type,
        warehouseId: values.warehouseId,
        supplierId: values.supplierId ?? undefined,
        fromDepartmentId: values.fromDepartmentId ?? undefined,
        invoiceNo: values.invoiceNo || undefined,
        invoiceDate: values.invoiceDate || undefined,
        receivedAt: values.receivedAt,
        qcStatus: values.qcStatus,
        qcNote: values.qcNote || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item) => ({
          supplyId: item.supplyId,
          lotNo: item.lotNo || undefined,
          expiresAt: item.expiresAt || undefined,
          // Chỉ một trong hai ô số lượng — ở chế độ đơn vị mua thì không gửi `quantity`.
          ...(item.purchaseUnit
            ? { purchaseQuantity: item.purchaseQuantity }
            : { quantity: item.quantity }),
          unitCost: item.unitCost,
        })),
      })
      const saved = editing ? await updateReceipt(id, body) : await createReceipt(body)
      const receiptId = editing ? id : saved.id
      setSavedId(receiptId)
      const warnings = (saved as { details?: { warnings?: string[] } }).details?.warnings ?? []
      void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
      toast.success(editing ? t('receiptSaved') : t('receiptCreated'))
      if (warnings.length) {
        // Cảnh báo không chặn: ở lại form để người dùng đọc hết, không nhảy sang chi tiết.
        setSavedWarnings(warnings)
        return
      }
      navigate(`/stock/receipts/${receiptId}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader
        title={editing ? t('editReceipt') : t('createReceipt')}
        description={t('receiptFormHint')}
      />
      {savedWarnings.length > 0 && (
        <Alert variant="warning" data-tone="warning" className="mb-3">
          <CircleAlert />
          <AlertTitle>{t('receiptWarnings')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {savedWarnings.map((warning, index) => (
                <li key={`${index}-${warning}`}>{warning}</li>
              ))}
            </ul>
            {savedId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/stock/receipts/${savedId}`)}
              >
                {t('viewReceipt')}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form className="space-y-3" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard title={t('info')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SelectField
                control={form.control}
                name="type"
                label={t('type')}
                options={[
                  { value: 'purchase', label: t('receiptTypePurchase') },
                  { value: 'return_from_dept', label: t('receiptTypeReturn') },
                  { value: 'adjust_in', label: t('receiptTypeAdjustIn') },
                ]}
              />
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('warehouse')}
                      queryKey="warehouses"
                      loadOptions={(q) => catalogOptions('warehouses', q)}
                      value={field.value || null}
                      onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('type') === 'purchase' && (
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <AsyncSelect
                        label={t('supplier')}
                        queryKey="suppliers"
                        loadOptions={(q) => catalogOptions('suppliers', q)}
                        value={field.value}
                        onChange={field.onChange}
                        clearable
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch('type') === 'return_from_dept' && (
                <FormField
                  control={form.control}
                  name="fromDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <AsyncSelect
                        label={t('fromDepartment')}
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
              <TextField control={form.control} name="invoiceNo" label={t('invoiceNo')} />
              <DateField control={form.control} name="invoiceDate" label={t('invoiceDate')} />
              <DateField control={form.control} name="receivedAt" label={t('receivedAt')} />
              <SelectField
                control={form.control}
                name="qcStatus"
                label="QC"
                options={[
                  { value: 'pending', label: t('qcPending') },
                  { value: 'passed', label: t('qcPassed') },
                  { value: 'failed', label: t('qcFailed') },
                ]}
              />
              <TextField control={form.control} name="qcNote" label={t('qcNote')} />
              <TextField control={form.control} name="notes" label={t('notes')} />
            </div>
          </SectionCard>
          <SectionCard
            title={t('receiptItems')}
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  items.append({
                    supplyId: '',
                    lotNo: '',
                    expiresAt: '',
                    quantity: '1',
                    purchaseQuantity: '1',
                    purchaseUnit: false,
                    unitCost: '0',
                  })
                }
              >
                {t('addLine')}
              </Button>
            }
            bodyClassName="space-y-3"
            footer={
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[13px]">{t('totalAmount')}</span>
                <span className="text-[16px] font-bold tabular-nums">{formatVnd(total)}</span>
              </div>
            }
          >
            {items.fields.map((field, index) => {
              const supply = supplies[index]
              const purchaseMode = !!watched[index]?.purchaseUnit
              const canPurchase = !!(supply?.conversionFactor && supply?.purchaseUnitId)
              const purchaseUnitName = unitName(supply?.purchaseUnitId)
              const usageUnitName = unitName(supply?.unitId)
              const converted = purchaseMode
                ? convertPurchaseQuantity(
                    watched[index]?.purchaseQuantity ?? '',
                    supply?.conversionFactor ?? '',
                  )
                : ''
              const hint =
                purchaseMode && converted && purchaseUnitName && usageUnitName
                  ? t('conversionLine', {
                      qty: formatQty(watched[index]?.purchaseQuantity ?? ''),
                      purchaseUnit: purchaseUnitName,
                      converted: formatQty(converted),
                      usageUnit: usageUnitName,
                    })
                  : null
              const expired = supply ? circulationExpired(supply) : false
              return (
                <div
                  key={field.id}
                  className="border-divider grid gap-3 rounded-md border p-4 md:grid-cols-3 xl:grid-cols-5"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.supplyId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <AsyncSelect
                          label={t('supply')}
                          queryKey="supplies"
                          loadOptions={supplyOptions}
                          value={f.value || null}
                          onChange={(v) => f.onChange(typeof v === 'string' ? v : '')}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <TextField
                    control={form.control}
                    name={`items.${index}.lotNo`}
                    label={t('lot')}
                  />
                  <DateField
                    control={form.control}
                    name={`items.${index}.expiresAt`}
                    label={t('expiry')}
                  />
                  <div className="space-y-2">
                    {canPurchase && (
                      <UnitModeToggle
                        value={purchaseMode}
                        onChange={(value) => setUnitMode(index, value)}
                      />
                    )}
                    <QtyField
                      control={form.control}
                      name={
                        purchaseMode ? `items.${index}.purchaseQuantity` : `items.${index}.quantity`
                      }
                      label={
                        purchaseMode
                          ? purchaseUnitName
                            ? `${t('quantity')} (${purchaseUnitName})`
                            : t('quantityByPurchaseUnit')
                          : usageUnitName
                            ? `${t('quantity')} (${usageUnitName})`
                            : t('quantity')
                      }
                    />
                    {hint && <p className="text-muted-foreground text-[13px]">{hint}</p>}
                  </div>
                  <MoneyField
                    control={form.control}
                    name={`items.${index}.unitCost`}
                    label={t('unitCost')}
                  />
                  {expired && supply && (
                    <Alert variant="warning" data-tone="warning" className="col-span-full">
                      <CircleAlert />
                      <AlertTitle>{t('circulationValidTo')}</AlertTitle>
                      <AlertDescription>
                        {t('circulationExpiredInForm', {
                          code: supply.code,
                          date: formatDate(supply.circulationValidTo),
                        })}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="col-span-full flex items-center justify-between gap-3">
                    <p className="text-[13px]">
                      <span className="text-muted-foreground">{t('lineTotal')}</span>{' '}
                      <span className="font-semibold tabular-nums">
                        {formatVnd(moneyMul(effectiveQty(index), watched[index]?.unitCost ?? '0'))}
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => items.remove(index)}
                    >
                      {t('removeLine')}
                    </Button>
                  </div>
                </div>
              )
            })}
            {items.fields.length === 0 && (
              <p className="text-muted-foreground text-[13px]">{t('noLines')}</p>
            )}
          </SectionCard>
          <FormFooter
            onCancel={() => navigate(-1)}
            submitting={form.formState.isSubmitting}
            saveLabel={t('saveDraft')}
          />
        </form>
      </Form>
    </>
  )
}
