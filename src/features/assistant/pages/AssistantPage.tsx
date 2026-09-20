import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'
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
        <p role="status">{t('disabled')}</p>
        {isAdm && (
          <Button asChild variant="outline">
            <Link to="/admin/settings?tab=ai">Cấu hình AI</Link>
          </Button>
        )}
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
        actions={
          <Button asChild variant="outline">
            <Link to="/assistant/digest">{t('digest')}</Link>
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span>
          {params.get('equipmentId')
            ? t('equipmentContext', { id: params.get('equipmentId') })
            : t('selectContext')}
        </span>
        <span className="text-muted-foreground">
          Ngân sách còn: {status.data.budget?.remaining ?? '—'} · Hạn mức:{' '}
          {status.data.rateLimit?.remaining ?? '—'}
        </span>
      </div>
      <div className="grid min-h-[560px] gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-2 rounded-lg border p-3">
          <Button
            className="w-full"
            onClick={() => {
              setConversationId(undefined)
              dispatch({ type: 'replace', messages: [] })
            }}
          >
            {t('new')}
          </Button>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm hội thoại"
          />
          <ul className="space-y-1">
            {filtered.map((row) => (
              <li key={row.id} className="flex items-center gap-1">
                <Button
                  className="min-w-0 flex-1 justify-start truncate"
                  variant={conversationId === row.id ? 'secondary' : 'ghost'}
                  onClick={() => setConversationId(row.id)}
                >
                  {row.title}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Xoá ${row.title}`}
                  onClick={() => remove.mutate(row.id)}
                >
                  ⋯
                </Button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex min-w-0 flex-col rounded-lg border p-4">
          <div className="flex-1 space-y-3 overflow-auto" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((text) => (
                  <Button key={text} variant="outline" size="sm" onClick={() => void submit(text)}>
                    {text}
                  </Button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[80%] rounded-lg bg-primary p-3 text-primary-foreground'
                    : 'max-w-[90%] rounded-lg bg-muted p-3'
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
                        className="rounded-full border px-2 py-1 text-xs"
                        to={source.link}
                      >
                        Nguồn: {source.title}
                      </Link>
                    ) : (
                      <span key={source.title} className="rounded-full border px-2 py-1 text-xs">
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
          {status.data.budget?.remaining === 0 && (
            <Alert className="mb-2">
              <AlertTitle>Hết ngân sách tháng</AlertTitle>
              <AlertDescription>Liên hệ quản trị để tăng hạn mức.</AlertDescription>
            </Alert>
          )}
          <Textarea
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
          <div className="mt-2 flex gap-2">
            {streaming ? (
              <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                Dừng
              </Button>
            ) : (
              <Button onClick={() => void submit()}>{t('send')}</Button>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
