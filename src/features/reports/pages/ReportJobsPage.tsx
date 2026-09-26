import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionCard } from '@/components/page/SectionCard'
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
      <SectionCard
        title={t('jobsTitle')}
        description={t('jobCount', { n: jobs.data?.items.length ?? 0 })}
        flush
      >
        {jobs.isPending && (
          <p role="status" className="text-muted-foreground px-5 py-4 text-[13px]">
            {t('loadingJobs')}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t('report')}</TableHead>
              <TableHead>{t('format')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>Số dòng</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead>{t('finishedAt')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jobs.data?.items ?? []).map((job) => (
              <TableRow key={job.id}>
                <TableCell className="pl-5 font-medium">{job.name ?? job.key ?? job.id}</TableCell>
                <TableCell>{job.format}</TableCell>
                <TableCell>
                  <StatusBadge value={job.status} map={jobStatusMap} />
                </TableCell>
                <TableCell>{job.rowCount ?? '—'}</TableCell>
                <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                <TableCell>{job.finishedAt ? formatDateTime(job.finishedAt) : '—'}</TableCell>
                <TableCell>
                  {job.status === 'done' && (job.fileId || job.downloadUrl) && (
                    <Button size="sm" variant="outline" onClick={() => void download(job)}>
                      {t('download')}
                    </Button>
                  )}
                  {job.error && <span className="text-destructive">{job.error}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  )
}
