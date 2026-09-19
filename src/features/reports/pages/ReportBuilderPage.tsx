import { PageHeader } from '@/components/page/PageHeader'

export function Component() {
  return (
    <>
      <PageHeader title="Báo cáo tuỳ chỉnh" />
      <p className="text-muted-foreground text-sm">
        API D1 chưa có (`GET /v1/reports/sources`). Builder sẽ chọn nguồn, cột, lọc, nhóm và xem
        trước khi backend sẵn sàng.
      </p>
    </>
  )
}
