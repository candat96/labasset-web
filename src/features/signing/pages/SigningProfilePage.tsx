import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, LogOut, Search, ShieldCheck, ShieldX } from 'lucide-react'
import { messageFor } from '@/api/errors'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/format/date'
import {
  clearSigningSession,
  getSigningProfile,
  listCertificates,
  saveSigningProfile,
  signingKeys,
  type SaveSigningProfileBody,
  type SigningCertificate,
  type SigningProfileView,
} from '../api'
import '../i18n'

/** 30 ngày — khớp hằng số cảnh báo sắp hết hạn của backend. */
const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000

type CertChoice = {
  keyId: string
  serial: string
  subject: string
  displayName: string
  validFrom: string
  validTo: string
  provider?: string
}

function fromProfile(profile: SigningProfileView): CertChoice {
  return {
    keyId: profile.credentialId,
    serial: profile.certSerial,
    subject: profile.certSubject,
    displayName: profile.certSubject,
    validFrom: profile.certValidFrom,
    validTo: profile.certValidTo,
    provider: profile.providerKey,
  }
}

const fromCertificate = (cert: SigningCertificate): CertChoice => ({
  keyId: cert.keyId,
  serial: cert.serial,
  subject: cert.subject,
  displayName: cert.displayName,
  validFrom: cert.validFrom,
  validTo: cert.validTo,
  provider: cert.provider,
})

const isExpired = (validTo: string) => new Date(validTo).getTime() <= Date.now()

const isExpiringSoon = (validTo: string) => {
  const t = new Date(validTo).getTime()
  return t > Date.now() && t - Date.now() <= EXPIRING_SOON_MS
}

function Field({
  label,
  htmlFor,
  children,
  hint,
  action,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[13px] leading-5">
          {label}
        </Label>
        {action}
      </div>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  label,
  hint,
  autoComplete = 'off',
}: {
  id: string
  value: string
  onChange: (v: string) => void
  label: string
  hint?: string
  autoComplete?: string
}) {
  const { t } = useTranslation('signing')
  const [shown, setShown] = useState(false)
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      action={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t('hide') : t('show')}
        >
          {shown ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      }
    >
      <Input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function Component() {
  const { t } = useTranslation('signing')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canConfig = useCan(ADM)

  const profileQuery = useQuery({ queryKey: signingKeys.profile, queryFn: getSigningProfile })
  const profile = profileQuery.data?.profile ?? null
  const configured = profileQuery.data?.configured ?? true

  const [initialized, setInitialized] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [rememberPin, setRememberPin] = useState(false)
  const [selected, setSelected] = useState<CertChoice | null>(null)
  const [certs, setCerts] = useState<SigningCertificate[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (initialized || !profileQuery.data) return
    setUsername(profile?.username ?? '')
    setRememberPin(profile?.rememberPin ?? false)
    if (profile) setSelected(fromProfile(profile))
    setInitialized(true)
  }, [initialized, profileQuery.data, profile])

  const certChoices = useMemo<CertChoice[]>(() => (certs ?? []).map(fromCertificate), [certs])

  const lookup = useMutation({
    mutationFn: () => listCertificates(username.trim()),
    onSuccess: (rows) => {
      setCerts(rows)
      const current = profile?.credentialId
      const match = rows.find((c) => c.keyId === current)
      setSelected(match ? fromCertificate(match) : null)
      if (rows.length === 0) toast.info(t('lookupEmpty'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const save = useMutation({
    mutationFn: (body: SaveSigningProfileBody) => saveSigningProfile(body),
    onSuccess: () => {
      toast.success(t('saved'))
      setPassword('')
      setPin('')
      void queryClient.invalidateQueries({ queryKey: signingKeys.profile })
    },
    onError: (error) => setFormError(messageFor(error)),
  })

  const clearSession = useMutation({
    mutationFn: () => clearSigningSession(),
    onSuccess: () => {
      toast.success(t('cleared'))
      void queryClient.invalidateQueries({ queryKey: signingKeys.profile })
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const onLookup = () => {
    if (!username.trim()) {
      toast.error(t('needUsername'))
      return
    }
    setFormError(null)
    lookup.mutate()
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!username.trim()) {
      setFormError(t('needUsername'))
      return
    }
    if (!selected) {
      setFormError(t('needCert'))
      return
    }
    if (!profile?.passwordSet && !password.trim()) {
      setFormError(t('needPassword'))
      return
    }
    if (rememberPin && !profile?.pinSet && !pin.trim()) {
      setFormError(t('needPin'))
      return
    }
    setFormError(null)
    save.mutate({
      username: username.trim(),
      password: password.trim() ? password : undefined,
      pin: rememberPin && pin.trim() ? pin : undefined,
      rememberPin,
      credentialId: selected.keyId,
      certSerial: selected.serial,
      certSubject: selected.subject,
      certValidFrom: selected.validFrom,
      certValidTo: selected.validTo,
      providerKey: selected.provider,
    })
  }

  const profileExpired = profile ? isExpired(profile.certValidTo) : false
  const profileExpiringSoon = profile
    ? !profileExpired && (profile.expiringSoon || isExpiringSoon(profile.certValidTo))
    : false

  return (
    <>
      <PageHeader title={t('profileTitle')} description={t('profileHint')} />

      {!configured && (
        <Alert variant="warning" className="mb-4">
          <ShieldX aria-hidden />
          <AlertTitle>{t('notConfigured')}</AlertTitle>
          <AlertDescription>
            <span>{t('notConfiguredHint')}</span>
            {canConfig && (
              <p className="mt-1">
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  to="/admin/signing"
                >
                  {t('goToConfig')}
                </Link>
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {profileQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <ShieldX aria-hidden />
          <AlertTitle>{t('loadError')}</AlertTitle>
          <AlertDescription>{messageFor(profileQuery.error)}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title={t('setup')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('username')} htmlFor="signing-username" hint={t('usernameHint')}>
              <Input
                id="signing-username"
                value={username}
                autoComplete="off"
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <PasswordInput
              id="signing-password"
              label={t('password')}
              value={password}
              onChange={setPassword}
              hint={profile?.passwordSet ? t('passwordKeep') : t('passwordNotSet')}
            />

            <PasswordInput
              id="signing-pin"
              label={t('pin')}
              value={pin}
              onChange={setPin}
              hint={profile?.pinSet ? t('pinSet') : t('pinNotSet')}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3.5 py-2.5">
                <Label htmlFor="signing-remember-pin" className="text-[13px] leading-5">
                  {t('rememberPin')}
                </Label>
                <Switch
                  id="signing-remember-pin"
                  aria-label={t('rememberPin')}
                  checked={rememberPin}
                  onCheckedChange={setRememberPin}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {rememberPin ? t('rememberPinOn') : t('rememberPinOff')}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold">{t('lookupTitle')}</h3>
              <Button
                type="button"
                variant="outline"
                onClick={onLookup}
                disabled={lookup.isPending}
              >
                {lookup.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Search aria-hidden />
                )}
                {t('lookup')}
              </Button>
            </div>

            {certChoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('lookupIntro')}</p>
            ) : (
              <RadioGroup
                value={selected?.keyId ?? ''}
                onValueChange={(keyId) => {
                  const found = certChoices.find((c) => c.keyId === keyId)
                  if (found) setSelected(found)
                }}
                aria-label={t('chooseCert')}
              >
                {certChoices.map((cert) => {
                  const expired = isExpired(cert.validTo)
                  return (
                    <label
                      key={cert.keyId}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 ${
                        expired ? 'opacity-60' : ''
                      }`}
                    >
                      <RadioGroupItem
                        value={cert.keyId}
                        disabled={expired}
                        aria-label={cert.displayName}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{cert.displayName}</span>
                          {profile?.credentialId === cert.keyId && (
                            <Badge variant="info">{t('currentBadge')}</Badge>
                          )}
                          {expired && <Badge variant="destructive">{t('expired')}</Badge>}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {t('certSerial')}: {cert.serial}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {t('certValidity')}: {formatDate(cert.validFrom)} –{' '}
                          {formatDate(cert.validTo)}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>
            )}

            {formError && (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            )}
          </div>

          <FormFooter
            onCancel={() => {
              navigate('/profile')
            }}
            submitting={save.isPending}
            saveLabel={t('save')}
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={t('currentProfile')}>
            {profileQuery.isPending ? (
              <p className="text-muted-foreground text-sm">{t('common:page.loading')}</p>
            ) : !profile ? (
              <p className="text-muted-foreground text-sm">{t('noProfile')}</p>
            ) : (
              <div className="space-y-3">
                {profileExpired && (
                  <Alert variant="destructive">
                    <ShieldX aria-hidden />
                    <AlertTitle>{t('expired')}</AlertTitle>
                    <AlertDescription>
                      {t('certValidity')}: {formatDate(profile.certValidFrom)} –{' '}
                      {formatDate(profile.certValidTo)}
                    </AlertDescription>
                  </Alert>
                )}
                {profileExpiringSoon && (
                  <Alert variant="warning">
                    <ShieldCheck aria-hidden />
                    <AlertTitle>{t('expiringSoon')}</AlertTitle>
                    <AlertDescription>
                      {t('certValidity')}: {formatDate(profile.certValidFrom)} –{' '}
                      {formatDate(profile.certValidTo)}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <p className="text-muted-foreground text-xs">{t('certInUse')}</p>
                  <p className="text-sm font-medium break-words">{profile.certSubject}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('certSerial')}: {profile.certSerial}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t('certValidity')}: {formatDate(profile.certValidFrom)} –{' '}
                    {formatDate(profile.certValidTo)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={profile.passwordSet ? 'success' : 'outline'}>
                    {profile.passwordSet ? t('passwordSet') : t('passwordNotSet')}
                  </Badge>
                  <Badge variant={profile.pinSet ? 'success' : 'outline'}>
                    {profile.pinSet ? t('pinSet') : t('pinNotSet')}
                  </Badge>
                  <Badge variant={profile.rememberPin ? 'info' : 'outline'}>
                    {profile.rememberPin ? t('rememberPin') : t('rememberPinOff')}
                  </Badge>
                </div>

                <div className="border-divider border-t pt-3">
                  <p className="text-muted-foreground text-xs">
                    {t('sessionExpiresAt')}:{' '}
                    {profile.sessionExpiresAt
                      ? formatDate(profile.sessionExpiresAt)
                      : t('sessionNone')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => clearSession.mutate()}
                    disabled={clearSession.isPending}
                  >
                    {clearSession.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <LogOut aria-hidden />
                    )}
                    {t('clearSession')}
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </form>
    </>
  )
}
