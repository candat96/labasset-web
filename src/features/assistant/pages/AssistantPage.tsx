import { useState } from 'react'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// TODO(api): D2 AI chưa có trong OpenAPI. UI theo hợp đồng handoff/05-D2-ai-assistant.md.

export function Component() {
  const enabled = false
  const [draft, setDraft] = useState('')
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
      <PageHeader title="Trợ lý AI" />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside>
          <Button>Mới</Button>
        </aside>
        <section>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Câu hỏi" />
          <Button className="mt-2">Gửi</Button>
        </section>
      </div>
    </>
  )
}
