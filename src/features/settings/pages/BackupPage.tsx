import { PageHeader } from '@/components/page/PageHeader'

export function Component() {
  return (
    <>
      <PageHeader title="Sao lưu & khôi phục" />
      <p className="text-muted-foreground max-w-xl text-sm">
        {/* TODO(api): Tenant API chưa có endpoint backup/restore. Sao lưu do SYS vận hành. */}
        API viện không có màn sao lưu. Sao lưu CSDL do quản trị hệ thống (SYS) thực hiện trên máy
        chủ. Liên hệ SYS nếu cần xuất/khôi phục dữ liệu viện.
      </p>
    </>
  )
}
