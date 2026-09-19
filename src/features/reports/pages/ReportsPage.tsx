import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { listReportsSafe, type ReportMeta } from '../api'

export function Component() {
  const reports = useMemo(() => {
    void listReportsSafe()
    return [
      {
        key: 'equipment_status',
        title: 'Hiện trạng thiết bị',
        group: 'Thiết bị',
        params: {},
        columns: [],
      },
      {
        key: 'repair_cost',
        title: 'Chi phí sửa chữa',
        group: 'Sửa chữa',
        params: {},
        columns: [],
      },
    ] satisfies ReportMeta[]
  }, [])
  const [key, setKey] = useState<string | null>(null)
  const selected = reports.find((row) => row.key === key)
  const groups = [...new Set(reports.map((row) => row.group))]
  return (
    <>
      <PageHeader
        title="Báo cáo"
        actions={
          <Button asChild variant="outline">
            <Link to="/reports/builder">Báo cáo tuỳ chỉnh</Link>
          </Button>
        }
      />
      <p className="text-muted-foreground mb-3 text-sm">
        API D1 chưa có — danh sách theo hợp đồng, chạy thật khi backend sẵn sàng.
      </p>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-3">
          {groups.map((group) => (
            <section key={group}>
              <h2 className="mb-1 text-sm font-medium">{group}</h2>
              <ul>
                {reports
                  .filter((row) => row.group === group)
                  .map((row) => (
                    <li key={row.key}>
                      <button
                        type="button"
                        className="text-primary text-sm hover:underline"
                        onClick={() => setKey(row.key)}
                      >
                        {row.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </aside>
        <section>
          {selected ? (
            <div className="space-y-3">
              <h2 className="font-medium">{selected.title}</h2>
              <p className="text-muted-foreground text-sm">
                Form tham số sẽ sinh từ JSON schema khi API có.
              </p>
              <Button disabled>Xem</Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Chọn một báo cáo.</p>
          )}
        </section>
      </div>
    </>
  )
}
