import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  FileText,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'
import { sendFeedback, type AiMessage } from '../api'
import { ToolChips } from './ToolChips'

/** Định dạng markdown trong bong bóng trả lời (đậm, danh sách, code, bảng, trích dẫn…). */
const MARKDOWN = [
  'text-[14px] leading-[1.65]',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_p+p]:mt-3',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mt-1 [&_li]:marker:text-subtle',
  '[&_strong]:font-semibold',
  '[&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:bg-card [&_code]:border-divider [&_code]:rounded [&_code]:border [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12.5px]',
  '[&_pre]:bg-card [&_pre]:border-divider [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:p-3',
  '[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_h1]:mt-3 [&_h1]:text-[16px] [&_h1]:font-semibold',
  '[&_h2]:mt-3 [&_h2]:text-[15px] [&_h2]:font-semibold',
  '[&_h3]:mt-2.5 [&_h3]:text-[14px] [&_h3]:font-semibold',
  '[&_blockquote]:border-primary/40 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3',
  '[&_hr]:border-divider [&_hr]:my-3',
  // Bảng: bọc trong div cuộn ngang (xem `components.table` bên dưới)
  '[&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]',
  '[&_th]:bg-card [&_th]:border-divider [&_th]:border [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap',
  '[&_td]:border-divider [&_td]:border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top',
].join(' ')

const MARKDOWN_COMPONENTS = {
  table: (props: React.ComponentProps<'table'>) => (
    <div className="border-divider my-2 overflow-x-auto rounded-md border" data-testid="md-table">
      <table {...props} />
    </div>
  ),
}

/** Con trỏ nhấp nháy ở cuối nội dung đang stream. */
function Cursor() {
  return (
    <span
      data-testid="stream-cursor"
      className="bg-primary ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse align-text-bottom"
      aria-hidden
    />
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="bg-subtle size-1.5 animate-bounce rounded-full"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

/** Nội dung markdown có thể tái dùng (digest, bong bóng). */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn(MARKDOWN, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Một tin nhắn. Người dùng: nền primary-soft chữ tối, căn phải. Trợ lý: nền surface-2 không viền,
 * chiếm rộng; kèm chip tool, nguồn, sao chép, phản hồi; lỗi SSE hiện nền destructive + Thử lại.
 */
export function MessageBubble({
  message,
  onRetry,
}: {
  message: AiMessage
  onRetry?: (message: AiMessage) => void
}) {
  const { t } = useTranslation('assistant')
  const isUser = message.role === 'user'
  const [vote, setVote] = useState<'up' | 'down'>()
  const [copied, setCopied] = useState(false)
  const [askNote, setAskNote] = useState(false)
  const [note, setNote] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const canFeedback =
    !isUser &&
    !message.streaming &&
    !message.error &&
    !message.id.startsWith('pending-') &&
    !!message.content

  const feedback = async (value: 'up' | 'down', reason?: string) => {
    setVote(value)
    try {
      await sendFeedback(message.id, value, reason)
      toast.success(t('feedbackThanks'))
    } catch (error) {
      toast.error(messageFor(error) || t('feedbackError'))
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard không khả dụng */
    }
  }

  if (isUser)
    return (
      <div className="flex justify-end" data-role="user">
        <div className="bg-primary-soft text-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-[1.6] sm:max-w-[70%]">
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
          {message.attachmentFileIds && message.attachmentFileIds.length > 0 && (
            <p className="text-muted-foreground mt-1 text-[12px]">
              {t('attachedCount', { count: message.attachmentFileIds.length })}
            </p>
          )}
        </div>
      </div>
    )

  const errorText = message.error
    ? message.error.message ||
      t(`errors:${message.error.code}`, { defaultValue: message.error.code })
    : undefined

  // Lỗi mà chưa có chữ nào → chỉ hiện khối lỗi, không thêm bong bóng trống.
  const showBubble = !!message.content || !!message.streaming || !message.error

  return (
    <div className="flex gap-3" data-role="assistant">
      <div className="bg-primary-soft text-primary mt-1 grid size-7 shrink-0 place-items-center rounded-md">
        <Bot className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {message.tools && message.tools.length > 0 && <ToolChips tools={message.tools} />}
        {showBubble && (
          <div className="bg-surface-2 rounded-2xl rounded-tl-md px-4 py-3">
            {message.content ? (
              <div className="relative">
                <Markdown content={message.content} />
                {message.streaming && <Cursor />}
              </div>
            ) : message.streaming ? (
              <TypingDots />
            ) : (
              <p className="text-muted-foreground text-[13px]">{t('emptyAnswer')}</p>
            )}
          </div>
        )}
        {message.error && (
          <div
            role="alert"
            className="bg-destructive-bg text-destructive-fg flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl rounded-tl-md px-4 py-3 text-[13.5px]"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{errorText}</span>
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                className="bg-card"
                onClick={() => onRetry(message)}
              >
                <RotateCcw />
                {t('retry')}
              </Button>
            )}
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((source) =>
              source.link ? (
                <Link
                  key={source.title}
                  className="border-divider bg-card hover:border-primary/40 hover:text-primary inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors"
                  to={source.link}
                >
                  <FileText className="text-subtle size-3" aria-hidden />
                  <span>
                    {t('sourceLabel')}: {source.title}
                  </span>
                </Link>
              ) : (
                <span
                  key={source.title}
                  className="border-divider bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]"
                >
                  <FileText className="text-subtle size-3" aria-hidden />
                  <span>
                    {t('sourceLabel')}: {source.title}
                  </span>
                </span>
              ),
            )}
          </div>
        )}
        {!message.streaming && !message.error && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-subtle hover:text-foreground"
              aria-label={copied ? t('copied') : t('copy')}
              title={copied ? t('copied') : t('copy')}
              onClick={() => void copy()}
            >
              {copied ? <Check className="text-success" /> : <Copy />}
            </Button>
            {canFeedback && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'text-subtle hover:text-foreground',
                    vote === 'up' && 'text-primary',
                  )}
                  aria-label={t('feedbackUp')}
                  title={t('feedbackUp')}
                  onClick={() => void feedback('up')}
                >
                  <ThumbsUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'text-subtle hover:text-foreground',
                    vote === 'down' && 'text-destructive',
                  )}
                  aria-label={t('feedbackDown')}
                  title={t('feedbackDown')}
                  onClick={() => setAskNote(true)}
                >
                  <ThumbsDown />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <Dialog open={askNote} onOpenChange={setAskNote}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('feedbackTitle')}</DialogTitle>
            <DialogDescription>{t('feedbackHint')}</DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label={t('feedbackNote')}
            placeholder={t('feedbackNote')}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskNote(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => {
                setAskNote(false)
                void feedback('down', note.trim() || undefined)
                setNote('')
              }}
            >
              {t('feedbackSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
