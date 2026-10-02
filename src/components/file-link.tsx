import { useQuery } from '@tanstack/react-query'
import { getFileUrl } from '@/api/files'

/**
 * Link xem tệp đã tải lên (giấy chứng nhận, hoá đơn, báo giá…).
 *
 * URL của tệp phải xin theo từng lần (có hạn), nên không lưu sẵn trong bản ghi;
 * component tự gọi khi được vẽ và nhớ lại 10 phút.
 */
export function FileLink({ fileId, label }: { fileId: string | null | undefined; label: string }) {
  const url = useQuery({
    queryKey: ['file-url', fileId, false],
    queryFn: () => getFileUrl(fileId!, false),
    enabled: !!fileId,
    staleTime: 600_000,
  })
  if (!fileId) return <span>—</span>
  if (!url.data) return <span className="text-muted-foreground">…</span>
  return (
    <a className="text-primary" href={url.data.url} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}
