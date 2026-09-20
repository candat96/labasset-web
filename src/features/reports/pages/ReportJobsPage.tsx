import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/format/date'
import { getFileUrl } from '@/api/files'
import { listReportJobs, type ReportJob } from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('reports')
  const jobStatusMap = {
    queued: { label: t('jobQueued'), tone: 'muted' as const },
    running: { label: t('jobRunning'), tone: 'info' as const },
    done: { label: t('jobDone'), tone: 'success' as const },
    failed: { label: t('jobFailed'), tone: 'danger' as const },
  }

  const jobs = useQuery({
    queryKey: ['report-jobs'],
    queryFn: () => listReportJobs(),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((job) => job.status === 'queued' || job.status === 'running') ? 5000 : false
    },
  })
  const download = async (job: ReportJob) => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank', 'noopener')
      return
    }
    if (!job.fileId) return
    const url = await getFileUrl(job.fileId)
    window.open(url.url, '_blank', 'noopener')
  }
  return (
    <>
      <PageHeader title={t('jobsTitle')} description={t('jobsDesc')} />
      {jobs.isPending && <p role="status">{t('loadingJobs')}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('report')}</th>
            <th>{t('format')}</th>
            <th>{t('status')}</th>
            <th>Số dòng</th>
            <th>{t('createdAt')}</th>
            <th>{t('finishedAt')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(jobs.data?.items ?? []).map((job) => (
            <tr key={job.id} className="border-t">
              <td>{job.name ?? job.key ?? job.id}</td>
              <td>{job.format}</td>
              <td>
                <StatusBadge value={job.status} map={jobStatusMap} />
              </td>
              <td>{job.rowCount ?? '—'}</td>
              <td>{formatDateTime(job.createdAt)}</td>
              <td>{job.finishedAt ? formatDateTime(job.finishedAt) : '—'}</td>
              <td>
                {job.status === 'done' && (job.fileId || job.downloadUrl) && (
                  <Button size="sm" variant="outline" onClick={() => void download(job)}>
                    {t('download')}
                  </Button>
                )}
                {job.error && <span className="text-destructive">{job.error}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
