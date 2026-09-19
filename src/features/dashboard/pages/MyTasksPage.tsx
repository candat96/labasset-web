import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'

export function Component() {
  const repairs = useQuery({
    queryKey: ['my-tasks', 'repairs'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/repairs', {
          params: {
            query: pageQuery({
              assigneeId: 'me',
              status: 'accepted,in_progress,awaiting_parts,awaiting_vendor',
              page: 1,
              limit: 20,
            }),
          },
        }),
      ),
  })
  const tasks = useQuery({
    queryKey: ['my-tasks', 'maint'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/maintenance/tasks', {
          params: {
            query: pageQuery({
              assigneeId: 'me',
              status: 'scheduled,in_progress,overdue',
              page: 1,
              limit: 20,
            }),
          },
        }),
      ),
  })
  const pending = useQuery({
    queryKey: ['my-tasks', 'requests'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/requests', {
          params: { query: pageQuery({ pendingFor: 'me' as const, page: 1, limit: 20 }) as never },
        }),
      ),
  })
  const issued = useQuery({
    queryKey: ['my-tasks', 'issued'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/requests', {
          params: { query: pageQuery({ status: 'issued', page: 1, limit: 20 }) },
        }),
      ),
  })
  const groups = [
    {
      title: 'Sửa chữa của tôi',
      items: repairs.data?.items ?? [],
      href: (id: string) => `/repairs/${id}`,
      code: (r: { code: string }) => r.code,
    },
    {
      title: 'Bảo dưỡng của tôi',
      items: tasks.data?.items ?? [],
      href: (id: string) => `/maintenance/tasks/${id}`,
      code: (r: { code: string }) => r.code,
    },
    {
      title: 'Chờ tôi duyệt',
      items: pending.data?.items ?? [],
      href: (id: string) => `/requests/${id}`,
      code: (r: { code: string }) => r.code,
    },
    {
      title: 'Chờ nhận',
      items: issued.data?.items ?? [],
      href: (id: string) => `/requests/${id}`,
      code: (r: { code: string }) => r.code,
    },
  ].sort((a, b) => b.items.length - a.items.length)
  return (
    <>
      <PageHeader title="Việc của tôi" />
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 font-medium">
              {group.title} ({group.items.length})
            </h2>
            <ul className="space-y-1 text-sm">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link className="text-primary hover:underline" to={group.href(item.id)}>
                    {group.code(item)}
                  </Link>
                </li>
              ))}
              {group.items.length === 0 && <li className="text-muted-foreground">Không có việc</li>}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
