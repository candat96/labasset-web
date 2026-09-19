import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getStatus } from '../api'

// TODO(api): D2 AI chưa có trong OpenAPI. UI theo hợp đồng handoff/05-D2-ai-assistant.md.

export function Component() {
  const status = useQuery({ queryKey: ['ai-status'], queryFn: getStatus })
  const [params] = useSearchParams()
  const [draft, setDraft] = useState('')
  const enabled = status.data?.enabled === true
  if (status.isPending) return <p role="status">Đang kiểm tra trợ lý AI…</p>
  if (!enabled) {
    return (
      <>
        <PageHeader title="Trợ lý AI" />
        <p role="status">Chưa bật — liên hệ quản trị.</p>
      </>
    )
  }
  return (
    <>
      <PageHeader
        title="Trợ lý AI"
        actions={
          <Button asChild variant="outline">
            <Link to="/assistant/digest">Tóm tắt tuần</Link>
          </Button>
        }
      />
      <p className="text-muted-foreground mb-2 text-sm">
        {params.get('equipmentId')
          ? `Ngữ cảnh máy ${params.get('equipmentId')}`
          : 'Chọn ngữ cảnh máy khi tạo hội thoại.'}
      </p>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside>
          <Button>Mới</Button>
        </aside>
        <section>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Câu hỏi"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) event.preventDefault()
            }}
          />
          <Button className="mt-2">Gửi</Button>
        </section>
      </div>
    </>
  )
}
