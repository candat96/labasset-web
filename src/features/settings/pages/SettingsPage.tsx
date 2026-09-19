import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TextField, NumberField, SwitchField } from '@/components/form/fields'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { FileField } from '@/components/form/file-field'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { previewNumber, resolveWarehouse, saveSettings, searchWarehouses } from '../api'
import { changedSettings, settingField, values } from '../diff'
import { settingsKeys, useSettings } from '../hooks'
import { settingsSchema, type SettingsForm } from '../schema'
import { NUMBER_DEFAULTS, NUMBER_LABELS, NUMBER_TYPES, type NumberingType } from '../types'

const known = new Set([
  'hospital.name',
  'hospital.address',
  'hospital.logoFileId',
  'approval.levels',
  'repair.requireAcceptance',
  'requests.restrictToCompatible',
  'repair.sla',
  'stock.defaultWarehouseId',
  'stock.cancelWindowDays',
  'alerts.stockMinEnabled',
  'alerts.expiryDaysBefore',
  'alerts.maintenanceDaysBefore',
  'alerts.calibrationDaysBefore',
  'alerts.repairCostPctOfValue',
  'maintenance.dueGraceDays',
  ...NUMBER_TYPES.map((type) => `numbering.${type}`),
])

function previewText(result: { example?: string } | string) {
  if (typeof result === 'string') return result
  return result.example ?? JSON.stringify(result)
}

const TABS = ['hospital', 'workflow', 'stock', 'alerts', 'numbering', 'ai', 'other'] as const

export function Component() {
  const canWrite = useCan(ADM)
  const queryClient = useQueryClient()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((item) => item === params.get('tab')) ?? 'hospital'
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: values({}),
    mode: 'onBlur',
  })
  const [templates, setTemplates] = useState<Record<NumberingType, string>>(() => ({
    ...NUMBER_DEFAULTS,
  }))
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({})
  const [ai, setAi] = useState({
    enabled: false,
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    embeddingProvider: '',
    embeddingModel: '',
    monthlyTokenBudget: '0',
    apiKey: '',
  })
  useEffect(() => {
    if (settings.data) {
      form.reset(values(settings.data))
      setTemplates(
        Object.fromEntries(
          NUMBER_TYPES.map((type) => [
            type,
            typeof settings.data?.[`numbering.${type}`] === 'string'
              ? String(settings.data[`numbering.${type}`])
              : NUMBER_DEFAULTS[type],
          ]),
        ) as Record<NumberingType, string>,
      )
      setAi((current) => ({
        ...current,
        enabled: Boolean(settings.data?.['ai.enabled']),
        provider: String(settings.data?.['ai.provider'] ?? 'anthropic'),
        model: String(settings.data?.['ai.model'] ?? 'claude-sonnet-5'),
        embeddingProvider: String(settings.data?.['ai.embeddingProvider'] ?? ''),
        embeddingModel: String(settings.data?.['ai.embeddingModel'] ?? ''),
        monthlyTokenBudget: String(settings.data?.['ai.monthlyTokenBudget'] ?? '0'),
        apiKey: '',
      }))
    }
  }, [settings.data, form])
  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      toast.success('Đã lưu cấu hình')
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        error.code === 'SETTING_INVALID' &&
        error.details &&
        typeof error.details === 'object' &&
        'key' in error.details
      ) {
        const key = String((error.details as { key: unknown }).key)
        if (key.startsWith('numbering.')) {
          setTemplateErrors((current) => ({ ...current, [key]: messageFor(error) }))
          return
        }
        const field = settingField(key)
        if (field)
          form.setError(field as 'hospital.name', { type: 'server', message: messageFor(error) })
        else toast.error(messageFor(error))
      } else if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const other = useMemo(
    () =>
      Object.fromEntries(Object.entries(settings.data ?? {}).filter(([key]) => !known.has(key))),
    [settings.data],
  )
  if (settings.isPending) return <p role="status">Đang tải cấu hình…</p>
  if (settings.error)
    return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
  const submit = (after: SettingsForm) => {
    const errors: Record<string, string> = {}
    for (const type of NUMBER_TYPES) {
      if (templates[type] && !/\{SEQ/.test(templates[type]))
        errors[`numbering.${type}`] = 'Mẫu số phải chứa {SEQ'
    }
    setTemplateErrors(errors)
    if (Object.keys(errors).length) return
    const body = changedSettings(values(settings.data ?? {}), after, templates, settings.data ?? {})
    const original = settings.data ?? {}
    const putAi = (key: string, value: unknown, fallback: unknown) => {
      const previous = original[key] === undefined ? fallback : original[key]
      if (JSON.stringify(previous) !== JSON.stringify(value)) body[key] = value
    }
    putAi('ai.enabled', ai.enabled, false)
    putAi('ai.provider', ai.provider, 'anthropic')
    putAi('ai.model', ai.model, 'claude-sonnet-5')
    putAi('ai.embeddingProvider', ai.embeddingProvider, '')
    putAi('ai.embeddingModel', ai.embeddingModel, '')
    putAi('ai.monthlyTokenBudget', ai.monthlyTokenBudget, '0')
    if (ai.apiKey) body['ai.apiKey'] = ai.apiKey
    if (!Object.keys(body).length) {
      toast.message('Không có thay đổi')
      return
    }
    mutation.mutate(body)
  }
  return (
    <>
      <PageHeader title="Cấu hình hệ thống" />
      <Form {...form}>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const next = new URLSearchParams(params)
              next.set('tab', value)
              setParams(next, { replace: true })
            }}
          >
            <TabsList className="max-w-full flex-wrap">
              <TabsTrigger value="hospital">Viện</TabsTrigger>
              <TabsTrigger value="workflow">Quy trình</TabsTrigger>
              <TabsTrigger value="stock">Kho</TabsTrigger>
              <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
              <TabsTrigger value="numbering">Đánh số</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="other">Khác</TabsTrigger>
            </TabsList>
            <TabsContent
              value="hospital"
              forceMount
              className="space-y-4 data-[state=inactive]:hidden"
            >
              <TextField control={form.control} name="hospital.name" label="Tên bệnh viện" />
              <TextField control={form.control} name="hospital.address" label="Địa chỉ" />
              <FormField
                control={form.control}
                name="hospital.logoFileId"
                render={({ field }) => (
                  <FormItem>
                    <FileField
                      label="Logo bệnh viện"
                      accept="image/*"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent
              value="workflow"
              forceMount
              className="space-y-4 data-[state=inactive]:hidden"
            >
              <FormField
                control={form.control}
                name="approval.levels"
                render={({ field }) => (
                  <FormItem>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Số cấp duyệt</legend>
                      <RadioGroup
                        className="flex gap-4"
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value) as 1 | 2)}
                      >
                        {([1, 2] as const).map((level) => (
                          <label key={level} className="flex min-h-8 items-center gap-2 text-sm">
                            <RadioGroupItem value={String(level)} />
                            {level} cấp
                          </label>
                        ))}
                      </RadioGroup>
                    </fieldset>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SwitchField
                control={form.control}
                name="repair.requireAcceptance"
                label="Sửa chữa cần nghiệm thu"
              />
              <SwitchField
                control={form.control}
                name="requests.restrictToCompatible"
                label="Chỉ cho yêu cầu vật tư tương thích"
              />
              <div className="grid gap-4 sm:grid-cols-4">
                <NumberField
                  control={form.control}
                  name="repair.sla.low"
                  label="SLA thấp (giờ)"
                  min={1}
                />
                <NumberField
                  control={form.control}
                  name="repair.sla.medium"
                  label="SLA vừa (giờ)"
                  min={1}
                />
                <NumberField
                  control={form.control}
                  name="repair.sla.high"
                  label="SLA cao (giờ)"
                  min={1}
                />
                <NumberField
                  control={form.control}
                  name="repair.sla.critical"
                  label="SLA nghiêm trọng (giờ)"
                  min={1}
                />
              </div>
            </TabsContent>
            <TabsContent
              value="stock"
              forceMount
              className="space-y-4 data-[state=inactive]:hidden"
            >
              <FormField
                control={form.control}
                name="stock.defaultWarehouseId"
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label="Kho mặc định"
                      queryKey="warehouses"
                      loadOptions={searchWarehouses}
                      resolveOption={resolveWarehouse}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NumberField
                control={form.control}
                name="stock.cancelWindowDays"
                label="Số ngày được huỷ phiếu kho"
                min={0}
              />
            </TabsContent>
            <TabsContent
              value="alerts"
              forceMount
              className="grid gap-4 sm:grid-cols-2 data-[state=inactive]:hidden"
            >
              <SwitchField
                control={form.control}
                name="alerts.stockMinEnabled"
                label="Bật cảnh báo tồn tối thiểu"
              />
              <NumberField
                control={form.control}
                name="alerts.expiryDaysBefore"
                label="Cảnh báo hết hạn trước (ngày)"
                min={0}
              />
              <NumberField
                control={form.control}
                name="alerts.maintenanceDaysBefore"
                label="Cảnh báo bảo dưỡng trước (ngày)"
                min={0}
              />
              <NumberField
                control={form.control}
                name="alerts.calibrationDaysBefore"
                label="Cảnh báo kiểm định trước (ngày)"
                min={0}
              />
              <NumberField
                control={form.control}
                name="alerts.repairCostPctOfValue"
                label="Ngưỡng chi phí sửa chữa (%)"
                min={0}
              />
              <NumberField
                control={form.control}
                name="maintenance.dueGraceDays"
                label="Số ngày gia hạn bảo dưỡng"
                min={0}
              />
            </TabsContent>
            <TabsContent
              value="numbering"
              forceMount
              className="space-y-3 data-[state=inactive]:hidden"
            >
              {NUMBER_TYPES.map((type) => (
                <div
                  key={type}
                  className="grid items-end gap-2 rounded border p-3 sm:grid-cols-[180px_1fr_auto]"
                >
                  <label className="text-sm font-medium" htmlFor={`number-${type}`}>
                    {NUMBER_LABELS[type]}
                  </label>
                  <div>
                    <Input
                      id={`number-${type}`}
                      value={templates[type] ?? ''}
                      onChange={(event) =>
                        setTemplates((current) => ({ ...current, [type]: event.target.value }))
                      }
                    />
                    {templateErrors[`numbering.${type}`] && (
                      <p className="text-destructive text-xs">
                        {templateErrors[`numbering.${type}`]}
                      </p>
                    )}
                    {previews[type] && (
                      <p className="text-muted-foreground text-xs">
                        Xem trước đã lưu: {previews[type]}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const result = await previewNumber(type)
                        setPreviews((current) => ({ ...current, [type]: previewText(result) }))
                      } catch (error) {
                        toast.error(messageFor(error))
                      }
                    }}
                  >
                    Xem trước
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="ai" forceMount className="space-y-4 data-[state=inactive]:hidden">
              <p className="text-muted-foreground text-sm">
                {/* TODO(api): D2 chưa có GET /v1/ai/status. Khoá gửi qua PUT /v1/settings. */}
                API D2 chưa có — lưu khoá `ai.*` khi backend sẵn sàng. Không hiện lại API key đã
                đặt.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  id="ai-enabled"
                  checked={ai.enabled}
                  onCheckedChange={(value) => setAi((current) => ({ ...current, enabled: value }))}
                />
                <Label htmlFor="ai-enabled">Bật trợ lý AI</Label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">Nhà cung cấp</Label>
                  <Input
                    id="ai-provider"
                    value={ai.provider}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, provider: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-model">Mô hình</Label>
                  <Input
                    id="ai-model"
                    value={ai.model}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, model: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-embed-provider">Embedding</Label>
                  <Input
                    id="ai-embed-provider"
                    value={ai.embeddingProvider}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, embeddingProvider: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-embed-model">Mô hình embedding</Label>
                  <Input
                    id="ai-embed-model"
                    value={ai.embeddingModel}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, embeddingModel: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-budget">Ngân sách token/tháng (0 = không giới hạn)</Label>
                  <Input
                    id="ai-budget"
                    value={ai.monthlyTokenBudget}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, monthlyTokenBudget: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-key">
                    API key {settings.data?.['ai.apiKeySet'] ? '(đã đặt)' : '(chưa đặt)'}
                  </Label>
                  <Input
                    id="ai-key"
                    type="password"
                    autoComplete="new-password"
                    value={ai.apiKey}
                    onChange={(event) =>
                      setAi((current) => ({ ...current, apiKey: event.target.value }))
                    }
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="other" forceMount className="data-[state=inactive]:hidden">
              <pre className="bg-muted overflow-auto rounded p-3 text-xs">
                {JSON.stringify(other, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
          {canWrite && (
            <Button type="submit" disabled={mutation.isPending}>
              Lưu thay đổi
            </Button>
          )}
        </form>
      </Form>
    </>
  )
}
