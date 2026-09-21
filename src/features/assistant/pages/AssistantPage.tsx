import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { Bot, Coins, Gauge, MessageSquarePlus, Microscope, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/page/ErrorState'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import {
  createConversation,
  deleteConversation,
  getStatus,
  listConversations,
  listMessages,
  sendFeedback,
  streamMessage,
} from '../api'
import { chatReducer } from '../chat'
import { ToolCard } from '../components/ToolCard'

const SUGGESTIONS = [
  'Máy nào quá hạn kiểm định tháng này?',
  'Hoá chất máy X còn chạy được bao lâu?',
  'Máy Y báo lỗi E12 xử lý thế nào?',
]

export function Component() {
  const { t } = useTranslation('assistant')
  const isAdm = useCan(ADM)
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [conversationId, setConversationId] = useState<string>()
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [messages, dispatch] = useReducer(chatReducer, [])
  const abortRef = useRef<AbortController | null>(null)
  const status = useQuery({ queryKey: ['ai-status'], queryFn: getStatus })
  const conversations = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: listConversations,
    enabled: status.data?.enabled === true,
  })
  const history = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
  })
  useEffect(() => {
    if (history.data && messages.length === 0) dispatch({ type: 'replace', messages: history.data })
  }, [history.data, messages.length])
  useEffect(() => () => abortRef.current?.abort(), [])
  const remove = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      if (id === conversationId) setConversationId(undefined)
      void qc.invalidateQueries({ queryKey: ['ai-conversations'] })
    },
  })

  const submit = async (content = draft) => {
    const clean = content.trim()
    if (!clean || abortRef.current) return
    let id = conversationId
    if (!id) {
      const created = await createConversation({
        title: clean.slice(0, 80),
        equipmentId: params.get('equipmentId') ?? undefined,
      })
      id = created.id
      setConversationId(id)
      void qc.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
    dispatch({ type: 'user', message: { id: crypto.randomUUID(), role: 'user', content: clean } })
    dispatch({ type: 'start', id: `pending-${Date.now()}` })
    setDraft('')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamMessage(
        id,
        { content: clean },
        (event) => dispatch({ type: 'event', event }),
        controller.signal,
      )
    } catch (error) {
      if (!controller.signal.aborted)
        dispatch({
          type: 'event',
          event: { event: 'error', data: JSON.stringify({ code: String(error) }) },
        })
    } finally {
      dispatch({ type: 'stop' })
      abortRef.current = null
    }
  }

  if (status.isPending) return <p role="status">{t('checking')}</p>
  if (status.error) return <ErrorState error={status.error} onRetry={() => void status.refetch()} />
  if (!status.data?.enabled)
    return (
      <>
        <PageHeader title={t('title')} />
        <SectionCard>
          <EmptyState
            icon={Bot}
            title={t('disabled')}
            action={
              isAdm && (
                <Button asChild variant="outline">
                  <Link to="/admin/settings?tab=ai">Cấu hình AI</Link>
                </Button>
              )
            }
          />
        </SectionCard>
      </>
    )
  const filtered = (conversations.data ?? []).filter((row) =>
    row.title.toLowerCase().includes(search.toLowerCase()),
  )
  const streaming = messages.some((message) => message.streaming)
  return (
    <>
      <PageHeader
        title={t('title')}
        meta={
          <>
            <PageMeta icon={<Microscope />}>
              {params.get('equipmentId')
                ? t('equipmentContext', { id: params.get('equipmentId') })
                : t('selectContext')}
            </PageMeta>
            <PageMeta icon={<Coins />}>
              Ngân sách còn: {status.data.budget?.remaining ?? '—'}
            </PageMeta>
            <PageMeta icon={<Gauge />}>Hạn mức: {status.data.rateLimit?.remaining ?? '—'}</PageMeta>
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/assistant/digest">{t('digest')}</Link>
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SectionCard
          title={t('conversations', { defaultValue: 'Hội thoại' })}
          className="h-[calc(100vh-180px)]"
          bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConversationId(undefined)
                dispatch({ type: 'replace', messages: [] })
              }}
            >
              <MessageSquarePlus />
              {t('new')}
            </Button>
          }
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm hội thoại"
          />
          <ul className="-mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {filtered.map((row) => (
              <li key={row.id} className="group/conv flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    'hover:bg-muted/70 min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors',
                    conversationId === row.id && 'bg-primary-soft text-primary font-semibold',
                  )}
                  onClick={() => setConversationId(row.id)}
                >
                  {row.title}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-subtle opacity-0 group-hover/conv:opacity-100 focus-visible:opacity-100"
                  aria-label={`Xoá ${row.title}`}
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-muted-foreground px-2.5 py-2 text-[13px]">
                {t('noConversations', { defaultValue: 'Chưa có hội thoại' })}
              </li>
            )}
          </ul>
        </SectionCard>
        <section className="bg-card shadow-card flex h-[calc(100vh-180px)] min-w-0 flex-col rounded-xl">
          <div className="flex-1 space-y-4 overflow-auto p-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="bg-primary-soft text-primary flex size-14 items-center justify-center rounded-2xl">
                  <Sparkles className="size-7" aria-hidden />
                </div>
                <div>
                  <p className="text-[16px] font-semibold">
                    {t('emptyTitle', { defaultValue: 'Hỏi trợ lý về máy, lỗi, vật tư…' })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[13px]">
                    {t('emptyHint', { defaultValue: 'Chọn một gợi ý hoặc nhập câu hỏi bên dưới.' })}
                  </p>
                </div>
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((text) => (
                    <Button
                      key={text}
                      variant="outline"
                      size="sm"
                      onClick={() => void submit(text)}
                    >
                      {text}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'bg-primary-soft text-foreground ml-auto max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-6'
                    : 'bg-surface-2 max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 text-[14px] leading-6 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5'
                }
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.tools?.map((tool) => (
                  <ToolCard key={tool.name} tool={tool} />
                ))}
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.sources?.map((source) =>
                    source.link ? (
                      <Link
                        key={source.title}
                        className="bg-card border-divider hover:text-primary rounded-full border px-2 py-0.5 text-[12px]"
                        to={source.link}
                      >
                        Nguồn: {source.title}
                      </Link>
                    ) : (
                      <span
                        key={source.title}
                        className="bg-card border-divider rounded-full border px-2 py-0.5 text-[12px]"
                      >
                        Nguồn: {source.title}
                      </span>
                    ),
                  )}
                </div>
                {message.role === 'assistant' &&
                  !message.streaming &&
                  !message.id.startsWith('pending-') && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Hữu ích"
                        onClick={() => void sendFeedback(message.id, 'up')}
                      >
                        👍
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Chưa hữu ích"
                        onClick={() => {
                          const note = window.prompt('Lý do (không bắt buộc)') ?? undefined
                          void sendFeedback(message.id, 'down', note)
                        }}
                      >
                        👎
                      </Button>
                    </div>
                  )}
              </article>
            ))}
          </div>
          <div className="border-divider border-t p-4">
            {status.data.budget?.remaining === 0 && (
              <Alert variant="warning" className="mb-3">
                <AlertTitle>Hết ngân sách tháng</AlertTitle>
                <AlertDescription>Liên hệ quản trị để tăng hạn mức.</AlertDescription>
              </Alert>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                className="min-h-11 flex-1 resize-none"
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={t('question')}
                placeholder={t('question')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void submit()
                  }
                }}
              />
              {streaming ? (
                <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                  Dừng
                </Button>
              ) : (
                <Button onClick={() => void submit()}>{t('send')}</Button>
              )}
            </div>
            <p className="text-subtle mt-2 text-[12px]">
              {t('enterHint', { defaultValue: 'Enter để gửi · Shift+Enter xuống dòng' })}
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
