import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import {
  Bell,
  Bot,
  Boxes,
  Braces,
  Building2,
  DatabaseZap,
  Gauge,
  GitBranch,
  Hash,
  Loader2,
} from 'lucide-react'
import { ErrorState } from '@/components/page/ErrorState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TextField, NumberField, SwitchField, SelectField } from '@/components/form/fields'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { FileField } from '@/components/form/file-field'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import {
  getAiStatus,
  previewNumber,
  reindexAiDocuments,
  resolveWarehouse,
  saveSettings,
  searchWarehouses,
  testAiSettings,
} from '../api'
import { changedSettings, settingField, values } from '../diff'
import { isValidNumberingTemplate } from '../numbering'
import { settingsKeys, useSettings } from '../hooks'
import { settingsSchema, type SettingsForm } from '../schema'
import { AUTO_CODE_NUMBER_TYPES, NUMBER_DEFAULTS, NUMBER_TYPES, type NumberingType } from '../types'
import {
  CHAT_PRESETS,
  EMBEDDING_PRESETS,
  baseUrlEndpointSuffix,
  findPreset,
  type ProviderPreset,
} from '../ai-providers'

type ChatProtocol = 'openai_compatible' | 'anthropic'
type EmbeddingProtocol = 'openai_compatible' | 'voyage' | 'none'

interface AiFormState {
  enabled: boolean
  chat: {
    protocol: ChatProtocol
    baseUrl: string
    model: string
    apiKey: string
    headers: string
  }
  embedding: {
    protocol: EmbeddingProtocol
    baseUrl: string
    model: string
    dimensions: string
    apiKey: string
  }
  monthlyTokenBudget: string
}

const AI_DEFAULTS = {
  chatProtocol: 'openai_compatible' as ChatProtocol,
  chatBaseUrl: 'https://api.openai.com/v1',
  chatModel: 'gpt-4o-mini',
  embeddingProtocol: 'openai_compatible' as EmbeddingProtocol,
  embeddingBaseUrl: 'https://api.openai.com/v1',
  embeddingModel: 'text-embedding-3-small',
  dimensions: 1024,
  monthlyTokenBudget: 0,
}

const CHAT_PRESET_LABELS: Record<string, string> = {
  openai: 'presetOpenai',
  openrouter: 'presetOpenrouter',
  deepseek: 'presetDeepseek',
  glm: 'presetGlm',
  groq: 'presetGroq',
  ollama: 'presetOllama',
  anthropic: 'presetAnthropic',
  custom: 'presetCustom',
}

const EMBEDDING_PRESET_LABELS: Record<string, string> = {
  openai: 'presetOpenai',
  openrouter: 'presetOpenrouter',
  voyage: 'presetVoyage',
  ollama: 'presetOllama',
  custom: 'presetCustom',
}

function isValidHeadersJson(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    return Object.values(parsed as Record<string, unknown>).every((v) => typeof v === 'string')
  } catch {
    return false
  }
}

function headersToText(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '[object Object]') return ''
    return trimmed
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value as object).length === 0) return ''
    return JSON.stringify(value)
  }
  return ''
}

function applyPresetFields<T extends { protocol: string; baseUrl: string; model: string }>(
  current: T,
  preset: ProviderPreset | undefined,
  toProtocol: (value: unknown) => T['protocol'],
): T {
  if (!preset) return current
  return {
    ...current,
    protocol: toProtocol(preset.protocol),
    baseUrl: preset.baseUrl,
    model: preset.models.includes(current.model)
      ? current.model
      : (preset.models[0] ?? current.model),
  }
}

function toChatProtocol(value: unknown): ChatProtocol {
  return value === 'anthropic' ? 'anthropic' : 'openai_compatible'
}

function toEmbeddingProtocol(value: unknown): EmbeddingProtocol {
  return value === 'voyage' || value === 'none' ? (value as EmbeddingProtocol) : 'openai_compatible'
}

function presetOptions(
  presets: ProviderPreset[],
  labels: Record<string, string>,
  t: (key: string) => string,
) {
  return [
    ...presets.map((preset) => ({
      value: preset.id,
      label: t(`ai.${labels[preset.id] ?? 'presetCustom'}`),
    })),
    { value: 'custom', label: t('ai.presetCustom') },
  ]
}

function presetModels(presets: ProviderPreset[], id: string): string[] {
  return id === 'custom' ? [] : (presets.find((preset) => preset.id === id)?.models ?? [])
}

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
  'kpi.areaWeights',
  'kpi.metricWeights',
  'kpi.assistantWeight',
  'kpi.countBy',
  'kpi.minItems',
  'kpi.staffCanSeeRanking',
  // Đánh số: nhóm gốc + các loại mã tự sinh mới (handoff 16)
  ...[...NUMBER_TYPES, ...AUTO_CODE_NUMBER_TYPES].map((type) => `numbering.${type}`),
])

function previewText(result: { example?: string } | string) {
  if (typeof result === 'string') return result
  return result.example ?? JSON.stringify(result)
}

const TABS = ['hospital', 'workflow', 'stock', 'alerts', 'numbering', 'kpi', 'ai', 'other'] as const

export function Component() {
  const { t } = useTranslation('settings')
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
  const [ai, setAi] = useState<AiFormState>(() => ({
    enabled: false,
    chat: {
      protocol: AI_DEFAULTS.chatProtocol,
      baseUrl: AI_DEFAULTS.chatBaseUrl,
      model: AI_DEFAULTS.chatModel,
      apiKey: '',
      headers: '',
    },
    embedding: {
      protocol: AI_DEFAULTS.embeddingProtocol,
      baseUrl: AI_DEFAULTS.embeddingBaseUrl,
      model: AI_DEFAULTS.embeddingModel,
      dimensions: String(AI_DEFAULTS.dimensions),
      apiKey: '',
    },
    monthlyTokenBudget: String(AI_DEFAULTS.monthlyTokenBudget),
  }))
  const [chatKeySet, setChatKeySet] = useState(false)
  const [embeddingKeySet, setEmbeddingKeySet] = useState(false)
  const [clearChatKey, setClearChatKey] = useState(false)
  const [clearEmbeddingKey, setClearEmbeddingKey] = useState(false)
  const [headersError, setHeadersError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [testState, setTestState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'unsupported' | 'error'
    latencyMs?: number
    model?: string
    error?: string
  }>({ status: 'idle' })
  /** Trạng thái AI thật (host/model/embedding/ngân sách) — chỉ tải khi ADM mở tab AI. */
  const aiStatus = useQuery({
    queryKey: ['ai-status'],
    queryFn: getAiStatus,
    enabled: canWrite && tab === 'ai',
  })
  const reindex = useMutation({
    mutationFn: reindexAiDocuments,
    onSuccess: (result) => toast.success(t('ai.reindexDone', { count: result.queued ?? 0 })),
    onError: (error) => toast.error(messageFor(error)),
  })
  const chatUrlSuffix = baseUrlEndpointSuffix(ai.chat.baseUrl)
  const embeddingUrlSuffix = baseUrlEndpointSuffix(ai.embedding.baseUrl)
  useEffect(() => {
    if (settings.data) {
      form.reset(values(settings.data))
      setTemplates(
        Object.fromEntries(
          [...NUMBER_TYPES, ...AUTO_CODE_NUMBER_TYPES].map((type) => [
            type,
            typeof settings.data?.[`numbering.${type}`] === 'string'
              ? String(settings.data[`numbering.${type}`])
              : NUMBER_DEFAULTS[type],
          ]),
        ) as Record<NumberingType, string>,
      )
      const chat = {
        protocol: toChatProtocol(settings.data?.['ai.chat.protocol']),
        baseUrl: String(settings.data?.['ai.chat.baseUrl'] ?? AI_DEFAULTS.chatBaseUrl),
        model: String(settings.data?.['ai.chat.model'] ?? AI_DEFAULTS.chatModel),
        apiKey: '',
        headers: headersToText(settings.data?.['ai.chat.headers']),
      }
      const embedding = {
        protocol: toEmbeddingProtocol(settings.data?.['ai.embedding.protocol']),
        baseUrl: String(settings.data?.['ai.embedding.baseUrl'] ?? AI_DEFAULTS.embeddingBaseUrl),
        model: String(settings.data?.['ai.embedding.model'] ?? AI_DEFAULTS.embeddingModel),
        dimensions: String(settings.data?.['ai.embedding.dimensions'] ?? AI_DEFAULTS.dimensions),
        apiKey: '',
      }
      const budget = settings.data?.['ai.monthlyTokenBudget']
      setAi({
        enabled: Boolean(settings.data?.['ai.enabled']),
        chat,
        embedding,
        monthlyTokenBudget:
          budget === undefined || budget === null || budget === '' ? '0' : String(budget),
      })
      setChatKeySet(Boolean(settings.data?.['ai.chat.apiKeySet']))
      setEmbeddingKeySet(Boolean(settings.data?.['ai.embedding.apiKeySet']))
      setClearChatKey(false)
      setClearEmbeddingKey(false)
      setHeadersError('')
    }
  }, [settings.data, form])
  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      toast.success(t('saved'))
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
      Object.fromEntries(
        // Cấu hình AI (`ai.*`) sinh động qua tab AI theo hợp đồng provider 2026-09-21.
        Object.entries(settings.data ?? {}).filter(
          ([key]) => !known.has(key) && !key.startsWith('ai.'),
        ),
      ),
    [settings.data],
  )
  /** Tab Đánh số: nhóm gốc + các loại mã tự sinh mới (handoff 16) — backend có default cho tất cả. */
  const numberingTypes: readonly NumberingType[] = [...NUMBER_TYPES, ...AUTO_CODE_NUMBER_TYPES]
  const chatPreset = findPreset(CHAT_PRESETS, ai.chat.baseUrl, ai.chat.protocol)?.id ?? 'custom'
  const embeddingPreset =
    findPreset(EMBEDDING_PRESETS, ai.embedding.baseUrl, ai.embedding.protocol)?.id ?? 'custom'
  const runTest = async () => {
    setTestState({ status: 'loading' })
    try {
      const headersText = ai.chat.headers.trim()
      const result = await testAiSettings({
        protocol: ai.chat.protocol,
        baseUrl: ai.chat.baseUrl.trim() || undefined,
        model: ai.chat.model.trim() || undefined,
        apiKey: ai.chat.apiKey.trim() || undefined,
        headers:
          headersText && isValidHeadersJson(headersText)
            ? (JSON.parse(headersText) as Record<string, string>)
            : undefined,
      })
      if (result?.ok)
        setTestState({ status: 'ok', latencyMs: result.latencyMs, model: result.model })
      else setTestState({ status: 'error', error: result?.error ?? t('ai.testFailed') })
    } catch (error) {
      if (isApiError(error) && error.status === 404) setTestState({ status: 'unsupported' })
      else setTestState({ status: 'error', error: messageFor(error) })
    }
  }
  if (settings.isPending) return <DetailSkeleton label={t('loading')} />
  if (settings.error)
    return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
  const submit = (after: SettingsForm) => {
    const errors: Record<string, string> = {}
    for (const type of NUMBER_TYPES) {
      if (templates[type] && !isValidNumberingTemplate(templates[type]))
        errors[`numbering.${type}`] = t('numbering.invalid')
    }
    setTemplateErrors(errors)
    if (Object.keys(errors).length) return
    const body = changedSettings(values(settings.data ?? {}), after, templates, settings.data ?? {})
    const original = settings.data ?? {}
    const putAi = (key: string, value: unknown, fallback: unknown) => {
      const previous = original[key] === undefined ? fallback : original[key]
      if (JSON.stringify(previous) !== JSON.stringify(value)) body[key] = value
    }
    const putAiNumber = (key: string, value: number, fallback: number) => {
      const raw = original[key]
      const previous = raw === undefined || raw === null || raw === '' ? fallback : Number(raw)
      if (previous !== value) body[key] = value
    }
    const chatHeaders = ai.chat.headers.trim()
    if (chatHeaders && !isValidHeadersJson(chatHeaders)) {
      setHeadersError(t('ai.headersInvalid'))
      return
    }
    putAi('ai.enabled', ai.enabled, false)
    putAi('ai.chat.protocol', ai.chat.protocol, AI_DEFAULTS.chatProtocol)
    putAi('ai.chat.baseUrl', ai.chat.baseUrl, AI_DEFAULTS.chatBaseUrl)
    putAi('ai.chat.model', ai.chat.model, AI_DEFAULTS.chatModel)
    putAi(
      'ai.chat.headers',
      chatHeaders ? (JSON.parse(chatHeaders) as Record<string, string>) : {},
      {},
    )
    putAi('ai.embedding.protocol', ai.embedding.protocol, AI_DEFAULTS.embeddingProtocol)
    putAi('ai.embedding.baseUrl', ai.embedding.baseUrl, AI_DEFAULTS.embeddingBaseUrl)
    putAi('ai.embedding.model', ai.embedding.model, AI_DEFAULTS.embeddingModel)
    putAiNumber(
      'ai.embedding.dimensions',
      Number(ai.embedding.dimensions) || AI_DEFAULTS.dimensions,
      AI_DEFAULTS.dimensions,
    )
    putAiNumber(
      'ai.monthlyTokenBudget',
      Math.max(0, Math.floor(Number(ai.monthlyTokenBudget) || 0)),
      AI_DEFAULTS.monthlyTokenBudget,
    )
    if (clearChatKey) body['ai.chat.apiKey'] = ''
    else if (ai.chat.apiKey) body['ai.chat.apiKey'] = ai.chat.apiKey
    if (clearEmbeddingKey) body['ai.embedding.apiKey'] = ''
    else if (ai.embedding.apiKey) body['ai.embedding.apiKey'] = ai.embedding.apiKey
    if (!Object.keys(body).length) {
      toast.message(t('noChange'))
      return
    }
    mutation.mutate(body)
  }
  const kpiArea = form.watch('kpi.areaWeights')
  const areaWeightSum = kpiArea.repair + kpiArea.maintenance + kpiArea.calibration
  return (
    <>
      <PageHeader title={t('title')} description={t('hint')} />
      <Form {...form}>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <Tabs
            orientation="vertical"
            className="items-start gap-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]"
            value={tab}
            onValueChange={(value) => {
              const next = new URLSearchParams(params)
              next.set('tab', value)
              setParams(next, { replace: true })
            }}
          >
            <TabsList
              variant="line"
              className="bg-card shadow-card w-full flex-row flex-wrap items-stretch gap-1 rounded-md border-b-0 p-2 lg:sticky lg:top-[72px] lg:flex-col"
            >
              {(
                [
                  ['hospital', Building2],
                  ['workflow', GitBranch],
                  ['stock', Boxes],
                  ['alerts', Bell],
                  ['numbering', Hash],
                  ['kpi', Gauge],
                  ['ai', Bot],
                  ['other', Braces],
                ] as const
              ).map(([value, Icon]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-9 justify-start gap-2 rounded-md px-3 text-[13.5px] after:hidden data-[state=active]:bg-primary-soft! data-[state=active]:text-primary"
                >
                  <Icon className="size-4" aria-hidden />
                  {t(`tabs.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="min-w-0 space-y-4">
              <TabsContent
                value="hospital"
                forceMount
                className="space-y-4 data-[state=inactive]:hidden"
              >
                <SectionCard title={t('tabs.hospital')}>
                  <div className="space-y-4">
                    <TextField
                      control={form.control}
                      name="hospital.name"
                      label={t('hospital.name')}
                    />
                    <TextField
                      control={form.control}
                      name="hospital.address"
                      label={t('hospital.address')}
                    />
                    <FormField
                      control={form.control}
                      name="hospital.logoFileId"
                      render={({ field }) => (
                        <FormItem>
                          <FileField
                            label={t('hospital.logoFileId')}
                            accept="image/*"
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent
                value="workflow"
                forceMount
                className="space-y-4 data-[state=inactive]:hidden"
              >
                <SectionCard title={t('tabs.workflow')}>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="approval.levels"
                      render={({ field }) => (
                        <FormItem>
                          <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">
                              {t('workflow.approvalLevels')}
                            </legend>
                            <RadioGroup
                              className="flex gap-4"
                              value={String(field.value)}
                              onValueChange={(value) => field.onChange(Number(value) as 1 | 2)}
                            >
                              {([1, 2] as const).map((level) => (
                                <label
                                  key={level}
                                  className="flex min-h-8 items-center gap-2 text-sm"
                                >
                                  <RadioGroupItem value={String(level)} />
                                  {t('workflow.level', { level })}
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
                      label={t('workflow.requireAcceptance')}
                    />
                    <SwitchField
                      control={form.control}
                      name="requests.restrictToCompatible"
                      label={t('workflow.restrictToCompatible')}
                    />
                    <div className="grid gap-4 sm:grid-cols-4">
                      <NumberField
                        control={form.control}
                        name="repair.sla.low"
                        label={t('workflow.slaLow')}
                        min={1}
                      />
                      <NumberField
                        control={form.control}
                        name="repair.sla.medium"
                        label={t('workflow.slaMedium')}
                        min={1}
                      />
                      <NumberField
                        control={form.control}
                        name="repair.sla.high"
                        label={t('workflow.slaHigh')}
                        min={1}
                      />
                      <NumberField
                        control={form.control}
                        name="repair.sla.critical"
                        label={t('workflow.slaCritical')}
                        min={1}
                      />
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent
                value="stock"
                forceMount
                className="space-y-4 data-[state=inactive]:hidden"
              >
                <SectionCard title={t('tabs.stock')}>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="stock.defaultWarehouseId"
                      render={({ field }) => (
                        <FormItem>
                          <AsyncSelect
                            label={t('stock.defaultWarehouseId')}
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
                      label={t('stock.cancelWindowDays')}
                      min={0}
                    />
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent
                value="alerts"
                forceMount
                className="grid gap-4 sm:grid-cols-2 data-[state=inactive]:hidden"
              >
                <SectionCard title={t('tabs.alerts')}>
                  <div className="space-y-4">
                    <SwitchField
                      control={form.control}
                      name="alerts.stockMinEnabled"
                      label={t('alerts.stockMinEnabled')}
                    />
                    <NumberField
                      control={form.control}
                      name="alerts.expiryDaysBefore"
                      label={t('alerts.expiryDaysBefore')}
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="alerts.maintenanceDaysBefore"
                      label={t('alerts.maintenanceDaysBefore')}
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="alerts.calibrationDaysBefore"
                      label={t('alerts.calibrationDaysBefore')}
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="alerts.repairCostPctOfValue"
                      label={t('alerts.repairCostPctOfValue')}
                      min={0}
                    />
                    <NumberField
                      control={form.control}
                      name="maintenance.dueGraceDays"
                      label={t('alerts.dueGraceDays')}
                      min={0}
                    />
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent value="numbering" className="space-y-3">
                <SectionCard title={t('tabs.numbering')}>
                  <div className="space-y-4">
                    {numberingTypes.map((type) => (
                      <div
                        key={type}
                        className="border-divider grid items-end gap-3 rounded-md border p-4 sm:grid-cols-[180px_1fr_auto]"
                      >
                        <label className="text-sm font-medium" htmlFor={`number-${type}`}>
                          {t(`numbering.${type}`)}
                        </label>
                        <div>
                          <Input
                            id={`number-${type}`}
                            value={templates[type] ?? ''}
                            onChange={(event) =>
                              setTemplates((current) => ({
                                ...current,
                                [type]: event.target.value,
                              }))
                            }
                          />
                          {templateErrors[`numbering.${type}`] && (
                            <p className="text-destructive text-xs">
                              {templateErrors[`numbering.${type}`]}
                            </p>
                          )}
                          {previews[type] && (
                            <output className="text-xs text-muted-foreground">
                              {t('numbering.previewSaved', { value: previews[type] })}
                            </output>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const result = await previewNumber(type)
                              setPreviews((current) => ({
                                ...current,
                                [type]: previewText(result),
                              }))
                            } catch (error) {
                              toast.error(messageFor(error))
                            }
                          }}
                        >
                          {t('numbering.preview')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent
                value="kpi"
                forceMount
                className="space-y-4 data-[state=inactive]:hidden"
              >
                <SectionCard title={t('kpi.title')} description={t('kpi.hint')}>
                  <div className="space-y-4">
                    <fieldset className="border-divider space-y-3 rounded-md border p-4">
                      <legend className="px-1 text-sm font-medium">{t('kpi.areaWeights')}</legend>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <NumberField
                          control={form.control}
                          name="kpi.areaWeights.repair"
                          label={t('kpi.repair')}
                          min={0}
                        />
                        <NumberField
                          control={form.control}
                          name="kpi.areaWeights.maintenance"
                          label={t('kpi.maintenance')}
                          min={0}
                        />
                        <NumberField
                          control={form.control}
                          name="kpi.areaWeights.calibration"
                          label={t('kpi.calibration')}
                          min={0}
                        />
                      </div>
                      {areaWeightSum !== 100 && (
                        <p className="text-warning-fg text-xs" role="status">
                          {t('kpi.weightSumWarn')}
                        </p>
                      )}
                    </fieldset>
                    <fieldset className="border-divider space-y-4 rounded-md border p-4">
                      <legend className="px-1 text-sm font-medium">{t('kpi.metricWeights')}</legend>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-[12.5px] font-semibold uppercase">
                          {t('kpi.repair')}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-4">
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.repair.volume"
                            label={t('kpi.volume')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.repair.onTime"
                            label={t('kpi.onTime')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.repair.speed"
                            label={t('kpi.speed')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.repair.quality"
                            label={t('kpi.quality')}
                            min={0}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-[12.5px] font-semibold uppercase">
                          {t('kpi.maintenance')}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-4">
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.maintenance.volume"
                            label={t('kpi.volume')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.maintenance.onTime"
                            label={t('kpi.onTime')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.maintenance.speed"
                            label={t('kpi.speed')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.maintenance.quality"
                            label={t('kpi.quality')}
                            min={0}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-[12.5px] font-semibold uppercase">
                          {t('kpi.calibration')}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-4">
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.calibration.volume"
                            label={t('kpi.volume')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.calibration.onTime"
                            label={t('kpi.onTime')}
                            min={0}
                          />
                          <NumberField
                            control={form.control}
                            name="kpi.metricWeights.calibration.quality"
                            label={t('kpi.quality')}
                            min={0}
                          />
                        </div>
                      </div>
                    </fieldset>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <NumberField
                        control={form.control}
                        name="kpi.assistantWeight"
                        label={t('kpi.assistantWeight')}
                        min={0}
                        step={0.1}
                      />
                      <SelectField
                        control={form.control}
                        name="kpi.countBy"
                        label={t('kpi.countBy')}
                        options={[
                          { value: 'completed', label: t('kpi.countByCompleted') },
                          { value: 'closed', label: t('kpi.countByClosed') },
                        ]}
                      />
                      <NumberField
                        control={form.control}
                        name="kpi.minItems"
                        label={t('kpi.minItems')}
                        min={0}
                      />
                    </div>
                    <SwitchField
                      control={form.control}
                      name="kpi.staffCanSeeRanking"
                      label={t('kpi.staffCanSeeRanking')}
                    />
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent value="ai" forceMount className="space-y-4 data-[state=inactive]:hidden">
                <SectionCard title={t('tabs.ai')}>
                  <div className="space-y-4">
                    {aiStatus.data && (
                      <dl
                        role="group"
                        className="border-divider grid gap-x-6 gap-y-2 rounded-md border p-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4"
                        aria-label={t('ai.statusTitle')}
                      >
                        <div>
                          <dt className="text-muted-foreground">{t('ai.statusState')}</dt>
                          <dd
                            className={
                              aiStatus.data.enabled
                                ? 'text-success-fg font-medium'
                                : 'text-muted-foreground font-medium'
                            }
                          >
                            {aiStatus.data.enabled ? t('ai.statusOn') : t('ai.statusOff')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('ai.statusChat')}</dt>
                          <dd className="font-medium break-all">
                            {aiStatus.data.chat
                              ? `${aiStatus.data.chat.protocol} · ${aiStatus.data.chat.baseUrlHost} · ${aiStatus.data.chat.model}`
                              : (aiStatus.data.model ?? '—')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('ai.statusEmbedding')}</dt>
                          <dd className="font-medium break-all">
                            {aiStatus.data.embedding?.enabled
                              ? `${aiStatus.data.embedding.protocol} · ${aiStatus.data.embedding.model}`
                              : t('ai.statusEmbeddingOff')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('ai.statusBudget')}</dt>
                          <dd className="font-medium">
                            {aiStatus.data.budget?.monthlyTokenBudget
                              ? t('ai.statusBudgetValue', {
                                  used: (aiStatus.data.budget.used ?? 0).toLocaleString('vi-VN'),
                                  total:
                                    aiStatus.data.budget.monthlyTokenBudget.toLocaleString('vi-VN'),
                                })
                              : t('ai.statusBudgetUnlimited', {
                                  used: (aiStatus.data.budget?.used ?? 0).toLocaleString('vi-VN'),
                                })}
                          </dd>
                        </div>
                      </dl>
                    )}
                    <div className="bg-surface-2 flex items-center justify-between gap-4 rounded-md px-4 py-3">
                      <Label htmlFor="ai-enabled">{t('ai.enabled')}</Label>
                      <Switch
                        id="ai-enabled"
                        checked={ai.enabled}
                        onCheckedChange={(value) =>
                          setAi((current) => ({ ...current, enabled: value }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <fieldset className="border-divider space-y-3 rounded-md border p-4">
                        <legend className="px-1 text-sm font-medium">{t('ai.chat')}</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="ai-chat-protocol">{t('ai.protocol')}</Label>
                            <Select
                              value={ai.chat.protocol}
                              onValueChange={(value) =>
                                setAi((current) => ({
                                  ...current,
                                  chat: { ...current.chat, protocol: toChatProtocol(value) },
                                }))
                              }
                            >
                              <SelectTrigger id="ai-chat-protocol" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="openai_compatible">
                                  {t('ai.protocolOpenaiCompatible')}
                                </SelectItem>
                                <SelectItem value="anthropic">
                                  {t('ai.protocolAnthropic')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ai-chat-preset">{t('ai.provider')}</Label>
                            <Select
                              value={chatPreset}
                              onValueChange={(value) => {
                                const preset = CHAT_PRESETS.find((item) => item.id === value)
                                setAi((current) => ({
                                  ...current,
                                  chat:
                                    value === 'custom'
                                      ? current.chat
                                      : applyPresetFields(current.chat, preset, toChatProtocol),
                                }))
                              }}
                            >
                              <SelectTrigger id="ai-chat-preset" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {presetOptions(CHAT_PRESETS, CHAT_PRESET_LABELS, t).map(
                                  (option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ai-chat-base-url">{t('ai.baseUrl')}</Label>
                          <Input
                            id="ai-chat-base-url"
                            value={ai.chat.baseUrl}
                            placeholder={t('ai.baseUrlPlaceholder')}
                            aria-invalid={chatUrlSuffix ? true : undefined}
                            onChange={(event) =>
                              setAi((current) => ({
                                ...current,
                                chat: { ...current.chat, baseUrl: event.target.value },
                              }))
                            }
                          />
                          {chatUrlSuffix && (
                            <p className="text-warning-fg text-xs" role="alert">
                              {t('ai.baseUrlHasEndpoint', { suffix: chatUrlSuffix })}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ai-chat-model">{t('ai.model')}</Label>
                          <Input
                            id="ai-chat-model"
                            list="ai-chat-model-suggestions"
                            value={ai.chat.model}
                            placeholder={t('ai.modelPlaceholder')}
                            onChange={(event) =>
                              setAi((current) => ({
                                ...current,
                                chat: { ...current.chat, model: event.target.value },
                              }))
                            }
                          />
                          <datalist id="ai-chat-model-suggestions">
                            {presetModels(CHAT_PRESETS, chatPreset).map((model) => (
                              <option key={model} value={model} />
                            ))}
                          </datalist>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ai-chat-key">
                            {chatKeySet && !clearChatKey ? t('ai.apiKeySet') : t('ai.apiKeyUnset')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="ai-chat-key"
                              type="password"
                              autoComplete="new-password"
                              value={ai.chat.apiKey}
                              onChange={(event) =>
                                setAi((current) => ({
                                  ...current,
                                  chat: { ...current.chat, apiKey: event.target.value },
                                }))
                              }
                            />
                            {chatKeySet && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={clearChatKey}
                                onClick={() => setClearChatKey(true)}
                              >
                                {t('ai.clearKey')}
                              </Button>
                            )}
                          </div>
                          {clearChatKey && (
                            <p className="text-destructive text-xs">{t('ai.keyWillBeCleared')}</p>
                          )}
                        </div>
                        <CollapsiblePrimitive.Root
                          open={advancedOpen}
                          onOpenChange={setAdvancedOpen}
                        >
                          <CollapsiblePrimitive.Trigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="px-2">
                              {t('ai.advanced')}
                            </Button>
                          </CollapsiblePrimitive.Trigger>
                          <CollapsiblePrimitive.Content className="space-y-2 pt-1">
                            <div className="space-y-2">
                              <Label htmlFor="ai-chat-headers">{t('ai.headers')}</Label>
                              <Textarea
                                id="ai-chat-headers"
                                rows={3}
                                value={ai.chat.headers}
                                placeholder={t('ai.headersPlaceholder')}
                                aria-invalid={headersError ? true : undefined}
                                onChange={(event) => {
                                  const value = event.target.value
                                  setAi((current) => ({
                                    ...current,
                                    chat: { ...current.chat, headers: value },
                                  }))
                                  const trimmed = value.trim()
                                  setHeadersError(
                                    trimmed && !isValidHeadersJson(trimmed)
                                      ? t('ai.headersInvalid')
                                      : '',
                                  )
                                }}
                              />
                              {headersError && (
                                <p className="text-destructive text-xs">{headersError}</p>
                              )}
                            </div>
                          </CollapsiblePrimitive.Content>
                        </CollapsiblePrimitive.Root>
                      </fieldset>
                      <fieldset className="border-divider space-y-3 rounded-md border p-4">
                        <legend className="px-1 text-sm font-medium">{t('ai.embedding')}</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="ai-embedding-protocol">
                              {t('ai.embeddingProtocol')}
                            </Label>
                            <Select
                              value={ai.embedding.protocol}
                              onValueChange={(value) =>
                                setAi((current) => ({
                                  ...current,
                                  embedding: {
                                    ...current.embedding,
                                    protocol: toEmbeddingProtocol(value),
                                  },
                                }))
                              }
                            >
                              <SelectTrigger id="ai-embedding-protocol" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="openai_compatible">
                                  {t('ai.protocolOpenaiCompatible')}
                                </SelectItem>
                                <SelectItem value="voyage">{t('ai.protocolVoyage')}</SelectItem>
                                <SelectItem value="none">{t('ai.protocolNone')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ai-embedding-preset">{t('ai.embeddingProvider')}</Label>
                            <Select
                              value={embeddingPreset}
                              onValueChange={(value) => {
                                const preset = EMBEDDING_PRESETS.find((item) => item.id === value)
                                setAi((current) => ({
                                  ...current,
                                  embedding:
                                    value === 'custom'
                                      ? current.embedding
                                      : applyPresetFields(
                                          current.embedding,
                                          preset,
                                          toEmbeddingProtocol,
                                        ),
                                }))
                              }}
                            >
                              <SelectTrigger id="ai-embedding-preset" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {presetOptions(EMBEDDING_PRESETS, EMBEDDING_PRESET_LABELS, t).map(
                                  (option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {ai.embedding.protocol !== 'none' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="ai-embedding-base-url">
                                {t('ai.embeddingBaseUrl')}
                              </Label>
                              <Input
                                id="ai-embedding-base-url"
                                value={ai.embedding.baseUrl}
                                placeholder={t('ai.baseUrlPlaceholder')}
                                aria-invalid={embeddingUrlSuffix ? true : undefined}
                                onChange={(event) =>
                                  setAi((current) => ({
                                    ...current,
                                    embedding: {
                                      ...current.embedding,
                                      baseUrl: event.target.value,
                                    },
                                  }))
                                }
                              />
                              {embeddingUrlSuffix && (
                                <p className="text-warning-fg text-xs" role="alert">
                                  {t('ai.baseUrlHasEndpoint', { suffix: embeddingUrlSuffix })}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ai-embedding-model">{t('ai.embeddingModel')}</Label>
                              <Input
                                id="ai-embedding-model"
                                list="ai-embedding-model-suggestions"
                                value={ai.embedding.model}
                                placeholder={t('ai.embeddingModelPlaceholder')}
                                onChange={(event) =>
                                  setAi((current) => ({
                                    ...current,
                                    embedding: { ...current.embedding, model: event.target.value },
                                  }))
                                }
                              />
                              <datalist id="ai-embedding-model-suggestions">
                                {presetModels(EMBEDDING_PRESETS, embeddingPreset).map((model) => (
                                  <option key={model} value={model} />
                                ))}
                              </datalist>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ai-embedding-dimensions">{t('ai.dimensions')}</Label>
                              <Input
                                id="ai-embedding-dimensions"
                                type="number"
                                min={1}
                                value={ai.embedding.dimensions}
                                onChange={(event) =>
                                  setAi((current) => ({
                                    ...current,
                                    embedding: {
                                      ...current.embedding,
                                      dimensions: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="ai-embedding-key">
                            {embeddingKeySet && !clearEmbeddingKey
                              ? t('ai.embeddingApiKeySet')
                              : t('ai.embeddingApiKeyUnset')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="ai-embedding-key"
                              type="password"
                              autoComplete="new-password"
                              placeholder={
                                embeddingKeySet ? undefined : t('ai.embeddingApiKeyPlaceholder')
                              }
                              value={ai.embedding.apiKey}
                              onChange={(event) =>
                                setAi((current) => ({
                                  ...current,
                                  embedding: { ...current.embedding, apiKey: event.target.value },
                                }))
                              }
                            />
                            {embeddingKeySet && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={clearEmbeddingKey}
                                onClick={() => setClearEmbeddingKey(true)}
                              >
                                {t('ai.clearKey')}
                              </Button>
                            )}
                          </div>
                          {clearEmbeddingKey && (
                            <p className="text-destructive text-xs">{t('ai.keyWillBeCleared')}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ai-budget">{t('ai.budget')}</Label>
                          <Input
                            id="ai-budget"
                            type="number"
                            min={0}
                            value={ai.monthlyTokenBudget}
                            onChange={(event) =>
                              setAi((current) => ({
                                ...current,
                                monthlyTokenBudget: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </fieldset>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={testState.status === 'loading'}
                        onClick={() => void runTest()}
                      >
                        {testState.status === 'loading' ? t('ai.testing') : t('ai.test')}
                      </Button>
                      {canWrite && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reindex.isPending}
                          onClick={() => reindex.mutate()}
                        >
                          {reindex.isPending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <DatabaseZap />
                          )}
                          {t('ai.reindex')}
                        </Button>
                      )}
                      {testState.status === 'ok' && (
                        <Alert className="max-w-md">
                          <AlertTitle>{t('ai.testOk')}</AlertTitle>
                          <AlertDescription>
                            <p>
                              {t('ai.testChatResult', {
                                model: testState.model ?? ai.chat.model,
                                latencyMs: testState.latencyMs ?? 0,
                              })}
                            </p>
                            <p>
                              {ai.embedding.protocol === 'none'
                                ? t('ai.testEmbeddingOff')
                                : aiStatus.data?.embedding?.enabled
                                  ? t('ai.testEmbeddingResult', {
                                      model: aiStatus.data.embedding.model,
                                    })
                                  : t('ai.testEmbeddingSkipped')}
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}
                      {testState.status === 'unsupported' && (
                        <Alert className="max-w-md">
                          <AlertTitle>{t('ai.testUnsupported')}</AlertTitle>
                        </Alert>
                      )}
                      {testState.status === 'error' && (
                        <Alert variant="destructive" className="max-w-md">
                          <AlertTitle>{t('ai.testFailed')}</AlertTitle>
                          {testState.error && (
                            <AlertDescription>
                              <p>{testState.error}</p>
                            </AlertDescription>
                          )}
                        </Alert>
                      )}
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>
              <TabsContent value="other" forceMount className="data-[state=inactive]:hidden">
                <SectionCard title={t('tabs.other')}>
                  <div className="space-y-4">
                    <pre className="bg-surface-2 overflow-auto rounded-md p-4 text-[12px] leading-5">
                      {JSON.stringify(other, null, 2)}
                    </pre>
                  </div>
                </SectionCard>
              </TabsContent>
            </div>
          </Tabs>
          {canWrite && (
            <div className="bg-background/90 border-divider sticky bottom-0 z-10 -mx-1 mt-6 flex items-center justify-end gap-2 border-t px-1 py-3 backdrop-blur">
              <Button type="submit" disabled={mutation.isPending}>
                {t('save')}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </>
  )
}
