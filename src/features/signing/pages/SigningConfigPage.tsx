import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ShieldCheck, ShieldX } from 'lucide-react'
import { messageFor } from '@/api/errors'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getSigningConfig, saveSigningConfig, signingKeys } from '../api'
import '../i18n'

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] leading-5">
        {label}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

export function Component() {
  const { t } = useTranslation('signing')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const configQuery = useQuery({ queryKey: signingKeys.config, queryFn: getSigningConfig })

  const [initialized, setInitialized] = useState(false)
  const [provider, setProvider] = useState('intrust')
  const [baseUrl, setBaseUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (initialized || !configQuery.data) return
    setProvider(configQuery.data.providerKey || 'intrust')
    setBaseUrl(configQuery.data.baseUrl)
    setUsername(configQuery.data.username)
    setEnabled(configQuery.data.enabled)
    setInitialized(true)
  }, [initialized, configQuery.data])

  const save = useMutation({
    mutationFn: () =>
      saveSigningConfig({
        baseUrl: baseUrl.trim(),
        username: username.trim(),
        password: password ? password : undefined,
        providerKey: provider,
        enabled,
      }),
    onSuccess: () => {
      toast.success(t('savedConfig'))
      setPassword('')
      void queryClient.invalidateQueries({ queryKey: signingKeys.config })
    },
    onError: (error) => setFormError(messageFor(error)),
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!baseUrl.trim()) {
      setFormError(t('needBaseUrl'))
      return
    }
    if (!username.trim()) {
      setFormError(t('needConfigUsername'))
      return
    }
    setFormError(null)
    save.mutate()
  }

  const data = configQuery.data

  return (
    <>
      <PageHeader title={t('configTitle')} description={t('configHint')} />

      {configQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <ShieldX aria-hidden />
          <AlertTitle>{t('configLoadError')}</AlertTitle>
          <AlertDescription>{messageFor(configQuery.error)}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <SectionCard
          title={t('configTitle')}
          actions={
            data && (
              <Badge variant={data.passwordSet ? 'success' : 'outline'}>
                {data.passwordSet ? t('passwordSet') : t('passwordNotSet')}
              </Badge>
            )
          }
        >
          {configQuery.isPending ? (
            <p className="text-muted-foreground text-sm">{t('common:page.loading')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('provider')} htmlFor="signing-provider">
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger
                    id="signing-provider"
                    className="w-full"
                    aria-label={t('provider')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intrust">Intrust</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t('configUsername')} htmlFor="signing-config-username">
                <Input
                  id="signing-config-username"
                  value={username}
                  autoComplete="off"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field label={t('baseUrl')} htmlFor="signing-base-url" hint={t('baseUrlHint')}>
                <Input
                  id="signing-base-url"
                  value={baseUrl}
                  autoComplete="off"
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </Field>

              <Field
                label={t('configPassword')}
                htmlFor="signing-config-password"
                hint={t('configPasswordKeep')}
              >
                <div className="relative">
                  <Input
                    id="signing-config-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    aria-label={showPassword ? t('hide') : t('show')}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </Field>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3.5 py-2.5">
                  <Label htmlFor="signing-enabled" className="text-[13px] leading-5">
                    {t('enabled')}
                  </Label>
                  <Switch
                    id="signing-enabled"
                    aria-label={t('enabled')}
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
                <p className="text-muted-foreground text-xs">{t('enabledHint')}</p>
              </div>

              {formError && (
                <p role="alert" className="text-destructive text-sm sm:col-span-2">
                  {formError}
                </p>
              )}
            </div>
          )}

          <FormFooter
            onCancel={() => navigate('/admin/settings')}
            submitting={save.isPending}
            saveLabel={
              <>
                {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {t('saveConfig')}
              </>
            }
            extra={
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <ShieldCheck className="size-3.5" aria-hidden />
                {t('configHint')}
              </span>
            }
          />
        </SectionCard>
      </form>
    </>
  )
}
