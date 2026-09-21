import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { TextField, SelectField, NumberField } from '@/components/form/fields'
import { DatetimeField } from '@/components/form/datetime-field'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useHospital, useHospitalMutations } from '../hooks'
import { hospitalSchema, type HospitalValues } from '../schema'
import type { components } from '@/api/schema'

const empty: HospitalValues = {
  code: '',
  name: '',
  plan: 'standard',
  maxUsers: '',
  licenseExpiresAt: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
}

function toBody(values: HospitalValues) {
  return {
    code: values.code,
    name: values.name,
    plan: values.plan,
    maxUsers: values.maxUsers === '' || values.maxUsers == null ? null : values.maxUsers,
    licenseExpiresAt: values.licenseExpiresAt || null,
    contactName: values.contactName || null,
    contactEmail: values.contactEmail || null,
    contactPhone: values.contactPhone || null,
    notes: values.notes || null,
  }
}

export function Component() {
  const { t } = useTranslation('sys')
  const { t: tc } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const detail = useHospital(id)
  const mutations = useHospitalMutations()
  const form = useForm<HospitalValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: empty,
    mode: 'onBlur',
  })
  useEffect(() => {
    if (!detail.data) return
    form.reset({
      code: detail.data.code,
      name: detail.data.name,
      plan: detail.data.plan === 'pro' ? 'pro' : 'standard',
      maxUsers: detail.data.maxUsers ?? '',
      licenseExpiresAt: detail.data.licenseExpiresAt ?? '',
      contactName: detail.data.contactName ?? '',
      contactEmail: detail.data.contactEmail ?? '',
      contactPhone: detail.data.contactPhone ?? '',
      notes: detail.data.notes ?? '',
    })
  }, [detail.data, form])
  if (editing && detail.isPending) return <DetailSkeleton label={t('hospital.loading')} />
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: HospitalValues) => {
    try {
      const body = toBody(values) as components['schemas']['CreateHospitalDto']
      if (editing) {
        const before = detail.data
          ? toBody({
              code: detail.data.code,
              name: detail.data.name,
              plan: detail.data.plan === 'pro' ? 'pro' : 'standard',
              maxUsers: detail.data.maxUsers ?? '',
              licenseExpiresAt: detail.data.licenseExpiresAt ?? '',
              contactName: detail.data.contactName ?? '',
              contactEmail: detail.data.contactEmail ?? '',
              contactPhone: detail.data.contactPhone ?? '',
              notes: detail.data.notes ?? '',
            })
          : null
        const patch: Record<string, unknown> = {}
        for (const key of Object.keys(body) as (keyof typeof body)[]) {
          if (key === 'code') continue
          if (!before || JSON.stringify(body[key]) !== JSON.stringify(before[key]))
            patch[key] = body[key]
        }
        if (!Object.keys(patch).length) {
          toast.message(tc('actions.noChange'))
          return
        }
        await mutations.update.mutateAsync({
          id,
          body: patch as components['schemas']['UpdateHospitalDto'],
        })
        toast.success(t('hospital.saved'))
        navigate(`/sys/hospitals/${id}`)
      } else {
        const created = await mutations.create.mutateAsync(body)
        toast.success(t('hospital.created'))
        navigate(`/sys/hospitals/${created.id}`)
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={editing ? t('hospital.edit') : t('hospital.add')} />
      <Form {...form}>
        <form className="max-w-xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          {!editing && (
            <TextField
              control={form.control}
              name="code"
              label={t('hospital.fields.code')}
              transform={(value) => value.toUpperCase()}
            />
          )}
          <TextField control={form.control} name="name" label={t('hospital.fields.name')} />
          <SelectField
            control={form.control}
            name="plan"
            label={t('hospital.fields.plan')}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'pro', label: 'Pro' },
            ]}
          />
          <NumberField
            control={form.control}
            name="maxUsers"
            label={t('hospital.fields.maxUsers')}
            min={1}
          />
          <DatetimeField
            control={form.control}
            name="licenseExpiresAt"
            label={t('hospital.fields.licenseExpiresAt')}
          />
          <TextField
            control={form.control}
            name="contactName"
            label={t('hospital.fields.contactName')}
          />
          <TextField
            control={form.control}
            name="contactEmail"
            label={t('hospital.fields.contactEmail')}
          />
          <TextField
            control={form.control}
            name="contactPhone"
            label={t('hospital.fields.contactPhone')}
          />
          <TextField control={form.control} name="notes" label={t('hospital.fields.notes')} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {tc('actions.cancel')}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {tc('actions.save')}
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
