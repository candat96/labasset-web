import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowDown,
  Bot,
  CalendarClock,
  Coins,
  FlaskConical,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { PageSkeleton } from '@/components/page/DetailSkeleton'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { ConfirmDialog } from '@/components/page/ConfirmDialog'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'
import {
  createConversation,
  deleteConversation,
  getStatus,
  listConversations,
  listMessages,
  streamMessage,
  type AiConversation,
  type AiMessage,
} from '../api'
import { chatReducer } from '../chat'
import { ChatHeader } from '../components/ChatHeader'
import { Composer, type PendingImage } from '../components/Composer'
import { ConversationSidebar } from '../components/ConversationSidebar'
import { MessageBubble } from '../components/MessageBubble'

const SUGGESTIONS = [
  { key: 'suggestion1', icon: Wrench },
  { key: 'suggestion2', icon: FlaskConical },
  { key: 'suggestion3', icon: CalendarClock },
  { key: 'suggestion4', icon: Coins },
] as const

const PANEL_STORAGE_KEY = 'labasset.assistant.panel'

/** Panel hội thoại: nhớ trạng thái trong localStorage; mặc định mở trên ≥ xl, ẩn dưới đó. */
function readPanelState(): boolean {
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY)
    if (saved === 'open') return true
    if (saved === 'closed') return false
  } catch {
    /* localStorage bị chặn */
  }
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-7 shrink-0 rounded-lg" />
          <Skeleton className={cn('h-20 flex-1 rounded-2xl', row === 1 && 'w-3/4')} />
        </div>
      ))}
    </div>
  )
}

export function Component() {
  const { t } = useTranslation('assistant')
  const isAdm = useCan(ADM)
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const equipmentId = params.get('equipmentId') ?? undefined
  const [conversationId, setConversationId] = useState<string>()
  const [draft, setDraft] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [titleDraft, setTitleDraft] = useState('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(readPanelState)
  const [deleteTarget, setDeleteTarget] = useState<AiConversation>()
  const [messages, dispatch] = useReducer(chatReducer, [])
  const [showJump, setShowJump] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const messagesRef = useRef(messages)
  const loadedForRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const togglePanel = () =>
    setPanelOpen((current) => {
      const next = !current
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, next ? 'open' : 'closed')
      } catch {
        /* localStorage bị chặn */
      }
      return next
    })

  const status = useQuery({ queryKey: ['ai-status'], queryFn: getStatus })
  const conversations = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => listConversations(),
    enabled: status.data?.enabled === true,
  })
  const history = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
  })

  /** Nạp lịch sử khi đổi hội thoại — bỏ qua nếu đã có nội dung cục bộ (vừa gửi câu hỏi). */
  useEffect(() => {
    if (!conversationId || !history.data) return
    if (loadedForRef.current === conversationId) return
    if (messagesRef.current.length === 0) dispatch({ type: 'replace', messages: history.data })
    loadedForRef.current = conversationId
  }, [conversationId, history.data])

  useEffect(() => () => abortRef.current?.abort(), [])

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current
    if (!el) return
    // Cuộn tức thời khi bám đáy (đang stream) — smooth dễ bị huỷ giữa chừng và
    // làm `onScroll` tưởng người dùng đã cuộn lên nên ngừng bám đáy.
    if (!smooth || typeof el.scrollTo !== 'function') el.scrollTop = el.scrollHeight
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  /** Bám đáy khi có tin mới; nếu người dùng cuộn lên thì tôn trọng vị trí đang xem. */
  useEffect(() => {
    if (!pinnedRef.current) return
    scrollToBottom(false)
  }, [messages, scrollToBottom])

  useEffect(() => {
    pinnedRef.current = true
    setShowJump(false)
    scrollToBottom(false)
  }, [conversationId, scrollToBottom])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 120
    pinnedRef.current = atBottom
    setShowJump(!atBottom && messagesRef.current.length > 0)
  }

  const startNew = () => {
    abortRef.current?.abort()
    loadedForRef.current = undefined
    setConversationId(undefined)
    setTitleDraft('')
    dispatch({ type: 'replace', messages: [] })
  }

  const selectConversation = (row: AiConversation) => {
    if (row.id === conversationId) return
    abortRef.current?.abort()
    loadedForRef.current = undefined
    setConversationId(row.id)
    dispatch({ type: 'replace', messages: [] })
  }

  const remove = useMutation({
    mutationFn: (row: AiConversation) => deleteConversation(row.id),
    onSuccess: (_, row) => {
      if (row.id === conversationId) startNew()
      void qc.invalidateQueries({ queryKey: ['ai-conversations'] })
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const clearEquipment = () => {
    const next = new URLSearchParams(params)
    next.delete('equipmentId')
    setParams(next, { replace: true })
  }

  const submit = async (content = draft, attachmentFileIds?: string[]) => {
    const clean = content.trim()
    if (!clean || abortRef.current) return
    const fileIds =
      attachmentFileIds ?? images.map((image) => image.fileId).filter((id): id is string => !!id)
    pinnedRef.current = true
    setShowJump(false)
    let id = conversationId
    if (!id) {
      try {
        const created = await createConversation({
          title: titleDraft || clean.slice(0, 80),
          equipmentId,
        })
        id = created.id
      } catch (error) {
        toast.error(messageFor(error))
        return
      }
      loadedForRef.current = id
      setConversationId(id)
      void qc.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
    dispatch({
      type: 'user',
      message: {
        id: crypto.randomUUID(),
        role: 'user',
        content: clean,
        attachmentFileIds: fileIds.length ? fileIds : undefined,
      },
    })
    dispatch({ type: 'start', id: `pending-${Date.now()}` })
    setDraft('')
    setImages([])
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamMessage(
        id,
        { content: clean, attachmentFileIds: fileIds.length ? fileIds : undefined },
        (event) => dispatch({ type: 'event', event }),
        controller.signal,
      )
    } catch (error) {
      if (!controller.signal.aborted)
        dispatch({
          type: 'event',
          event: {
            event: 'error',
            data: JSON.stringify({ code: 'AI_PROVIDER_ERROR', message: messageFor(error) }),
          },
        })
    } finally {
      dispatch({ type: 'stop' })
      abortRef.current = null
    }
  }

  /** Thử lại: bỏ tin lỗi + câu hỏi ngay trước rồi gửi lại cùng nội dung/ảnh. */
  const retry = (failed: AiMessage) => {
    const at = messagesRef.current.findIndex((message) => message.id === failed.id)
    const question = at > 0 ? messagesRef.current[at - 1] : undefined
    if (!question || question.role !== 'user') return
    dispatch({ type: 'retry', id: failed.id })
    void submit(question.content, question.attachmentFileIds ?? [])
  }

  if (status.isPending) return <PageSkeleton label={t('checking')} kpis={0} />
  if (status.error) return <ErrorState error={status.error} onRetry={() => void status.refetch()} />
  if (!status.data?.enabled)
    return (
      <>
        <PageHeader title={t('title')} description={t('subtitle')} />
        <SectionCard>
          <EmptyState
            icon={Bot}
            title={t('disabled')}
            description={isAdm ? t('disabledAdminHint') : t('disabledUserHint')}
            action={
              isAdm && (
                <Button asChild>
                  <Link to="/admin/settings?tab=ai">{t('openAiSettings')}</Link>
                </Button>
              )
            }
          />
        </SectionCard>
      </>
    )

  const rows = conversations.data ?? []
  const filtered = rows
    .filter((row) => row.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const streaming = messages.some((message) => message.streaming)
  const budgetEmpty = status.data.budget?.remaining === 0
  /** Query lịch sử bị `enabled: false` nên vẫn `isPending` khi chưa chọn hội thoại. */
  const threadLoading = !!conversationId && history.isPending
  const threadError = !!conversationId && history.isError
  const active = rows.find((row) => row.id === conversationId)
  const firstQuestion = messages.find((message) => message.role === 'user')?.content
  const threadTitle =
    active?.title ?? firstQuestion?.slice(0, 80) ?? (titleDraft || t('newConversationTitle'))
  const empty = messages.length === 0 && !threadLoading && !threadError

  return (
    <>
      <div
        data-testid="assistant-layout"
        className="border-divider bg-card shadow-card relative flex h-[calc(100dvh-6rem)] min-h-[480px] overflow-hidden rounded-xl border"
      >
        {panelOpen && (
          <>
            <button
              type="button"
              aria-label={t('hidePanel')}
              className="bg-foreground/30 absolute inset-0 z-10 md:hidden"
              onClick={togglePanel}
            />
            <ConversationSidebar
              className="border-divider absolute inset-y-0 left-0 z-20 w-[260px] shrink-0 border-r md:static"
              conversations={filtered}
              loading={conversations.isPending}
              activeId={conversationId}
              search={search}
              onSearch={setSearch}
              onNew={startNew}
              onSelect={(row) => {
                selectConversation(row)
                if (!window.matchMedia('(min-width: 768px)').matches) togglePanel()
              }}
              onDelete={setDeleteTarget}
              onHide={togglePanel}
            />
          </>
        )}
        <section
          className="flex min-w-0 flex-1 flex-col"
          aria-label={t('title')}
          data-testid="chat-pane"
        >
          <ChatHeader
            title={threadTitle}
            editableTitle={!conversationId}
            onTitleChange={setTitleDraft}
            streaming={streaming}
            equipmentId={equipmentId}
            onClearEquipment={clearEquipment}
            status={status.data}
            panelOpen={panelOpen}
            onTogglePanel={togglePanel}
            onNew={startNew}
            onDelete={active ? () => setDeleteTarget(active) : undefined}
          />
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              aria-live="polite"
              className="h-full overflow-y-auto"
            >
              <div className="mx-auto w-full max-w-[860px] px-4 py-5 sm:px-6">
                {messages.length === 0 && threadLoading && <ThreadSkeleton />}
                {messages.length === 0 && !threadLoading && threadError && (
                  <EmptyState
                    icon={AlertCircle}
                    title={t('historyError')}
                    action={
                      <Button variant="outline" size="sm" onClick={() => void history.refetch()}>
                        {t('reload')}
                      </Button>
                    }
                  />
                )}
                {empty && (
                  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-8 text-center">
                    <div className="from-primary/15 to-primary/5 text-primary grid size-14 place-items-center rounded-2xl bg-gradient-to-br">
                      <Sparkles className="size-7" aria-hidden />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold">{t('emptyTitle')}</p>
                      <p className="text-muted-foreground mt-1 text-[13.5px]">{t('emptyHint')}</p>
                    </div>
                    <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion.key}
                          type="button"
                          onClick={() => void submit(t(suggestion.key))}
                          className="border-divider bg-card hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span className="bg-primary-soft text-primary grid size-8 shrink-0 place-items-center rounded-lg">
                            <suggestion.icon className="size-4" aria-hidden />
                          </span>
                          <span className="text-[13.5px] leading-5 font-medium">
                            {t(suggestion.key)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} onRetry={retry} />
                  ))}
                </div>
              </div>
            </div>
            {showJump && (
              <Button
                size="sm"
                variant="outline"
                className="shadow-pop absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full"
                onClick={() => {
                  pinnedRef.current = true
                  setShowJump(false)
                  scrollToBottom()
                }}
              >
                <ArrowDown />
                {t('scrollToBottom')}
              </Button>
            )}
          </div>
          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={() => void submit()}
            onStop={() => abortRef.current?.abort()}
            streaming={streaming}
            disabled={budgetEmpty}
            images={images}
            onImagesChange={(update) => setImages(update)}
          />
        </section>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title={t('deleteTitle')}
        description={t('deleteDesc', { title: deleteTarget?.title ?? '' })}
        confirmLabel={t('delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget)
          setDeleteTarget(undefined)
        }}
      />
    </>
  )
}
