import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/format/date'
import { getFileUrl } from '@/api/files'
import { listReportJobs, type ReportJob } from '../api'

const jobStatusMap = {
  queued: { label: 'Chờ', tone: 'muted' as const },
  running: { label: 'Đang chạy', tone: 'info' as const },
  done: { label: 'Xong', tone: 'success' as const },
  failed: { label: 'Lỗi', tone: 'danger' as const },
}

export function Component() {
  const jobs = useQuery({
    queryKey: ['report-jobs'],
    queryFn: () => listReportJobs(),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((job) => job.status === 'queued' || job.status === 'running') ? 5000 : false
    },
  })
  const download = async (job: ReportJob) => {
    if (!job.fileId) return
    const url = await getFileUrl(job.fileId)
    window.open(url.url, '_blank', 'noopener')
  }
  return (
    <>
      <PageHeader title="Báo cáo nền" description="Polling 5 giây khi còn job chưa xong." />
      {jobs.isPending && <p role="status">Đang tải job…</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Báo cáo</th>
            <th>Định dạng</th>
            <th>Trạng thái</th>
            <th>Tạo lúc</th>
            <th>Xong lúc</th>
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
              <td>{formatDateTime(job.createdAt)}</td>
              <td>{job.finishedAt ? formatDateTime(job.finishedAt) : '—'}</td>
              <td>
                {job.status === 'done' && job.fileId && (
                  <Button size="sm" variant="outline" onClick={() => void download(job)}>
                    Tải
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
