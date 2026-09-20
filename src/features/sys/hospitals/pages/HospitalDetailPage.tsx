import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { useConfirm } from '@/components/confirm-dialog'
import { TemporaryPasswordDialog } from '@/components/temporary-password-dialog'
import { messageFor } from '@/api/errors'
import { hospitalUsage } from '../api'
import { useHospital, useHospitalMutations } from '../hooks'

export function Component() {
  const { t } = useTranslation('sys')
  const { t: tc } = useTranslation()
  const { id = '' } = useParams()
  const detail = useHospital(id)
  const usage = useQuery({
    queryKey: ['sys-hospitals', 'usage', id],
    queryFn: () => hospitalUsage(id),
    enabled: !!id,
  })
  const mutations = useHospitalMutations()
  const { confirm, dialog } = useConfirm()
  const [password, setPassword] = useState<string | null>(null)
  if (detail.isPending) return <p role="status">{t('hospital.loading')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const run = async (
    action: 'suspend' | 'resume' | 'provision/retry' | 'migrate' | 'reset-admin',
    title: string,
  ) => {
    if ((await confirm({ title, destructive: action === 'suspend' })) === false) return
    try {
      if (action === 'reset-admin') {
        const result = await mutations.resetAdmin.mutateAsync(id)
        setPassword(result.tempPassword)
        toast.success(t('hospital.tempPassword', { username: result.username }))
        return
      }
      await mutations.action.mutateAsync({ id, action })
      toast.success(t('hospital.done'))
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <TemporaryPasswordDialog password={password} onClose={() => setPassword(null)} />
      <PageHeader
        title={row.name}
        description={row.code}
        badge={<StatusBadge value={row.status} map={commonStatusMap} />}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={`/sys/hospitals/${id}/edit`}>{tc('actions.edit')}</Link>
            </Button>
            {row.status === 'active' && (
              <Button
                variant="outline"
                onClick={() =>
                  void run('suspend', t('hospital.confirm.suspend', { name: row.name }))
                }
              >
                {t('hospital.actions.suspend')}
              </Button>
            )}
            {row.status === 'suspended' && (
              <Button
                onClick={() => void run('resume', t('hospital.confirm.resume', { name: row.name }))}
              >
                {t('hospital.actions.resume')}
              </Button>
            )}
            {row.status === 'failed' && (
              <Button
                onClick={() =>
                  void run(
                    'provision/retry',
                    t('hospital.confirm.retryProvision', { name: row.name }),
                  )
                }
              >
                {t('hospital.actions.retryProvision')}
              </Button>
            )}
            {(row.status === 'active' || row.status === 'suspended') && (
              <Button
                variant="outline"
                onClick={() =>
                  void run('migrate', t('hospital.confirm.migrate', { name: row.name }))
                }
              >
                {t('hospital.actions.migrate')}
              </Button>
            )}
            {row.status === 'active' && (
              <Button
                variant="outline"
                onClick={() =>
                  void run('reset-admin', t('hospital.confirm.resetAdmin', { name: row.name }))
                }
              >
                {t('hospital.actions.resetAdmin')}
              </Button>
            )}
          </>
        }
      />
      <dl className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('hospital.fields.plan')}</dt>
          <dd>{row.plan}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('hospital.fields.expires')}</dt>
          <dd>{formatDateTime(row.licenseExpiresAt) || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('hospital.fields.contact')}</dt>
          <dd>{row.contactName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('hospital.fields.migrations')}</dt>
          <dd>
            {row.migrations.error
              ? row.migrations.error
              : row.migrations.pending?.length
                ? row.migrations.pending.join(', ')
                : t('hospital.updated')}
          </dd>
        </div>
      </dl>
      <h2 className="mb-2 text-lg font-semibold">{t('hospital.provision')}</h2>
      <ul className="mb-6 space-y-2 text-sm">
        {row.provisionJobs.length === 0 && (
          <li className="text-muted-foreground">{t('hospital.noJobs')}</li>
        )}
        {row.provisionJobs.map((job) => (
          <li key={job.id} className="rounded border p-2">
            <StatusBadge value={job.status} map={commonStatusMap} /> {job.step} ·{' '}
            {formatDateTime(job.startedAt)}
            {job.log && (
              <pre className="text-muted-foreground mt-1 overflow-auto text-xs">{job.log}</pre>
            )}
          </li>
        ))}
      </ul>
      <h2 className="mb-2 text-lg font-semibold">{t('hospital.usage')}</h2>
      {usage.isPending && <p role="status">{t('hospital.usageLoading')}</p>}
      {usage.error && <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />}
      <ul className="space-y-1 text-sm">
        {(usage.data ?? []).map((item) => (
          <li key={item.date}>
            {item.date}: {item.users} user · {formatQty(item.storageBytes)} byte
          </li>
        ))}
        {usage.data?.length === 0 && (
          <li className="text-muted-foreground">{t('hospital.noUsage')}</li>
        )}
      </ul>
    </>
  )
}
