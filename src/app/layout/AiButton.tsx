import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCan } from '@/app/guards/useCan'
import { HEADS } from '@/routes/roles'
import { getStatus } from '@/features/assistant/api'
import { cn } from '@/lib/utils'

/** Nút mở Trợ lý AI trên header — chỉ hiện khi có quyền và AI đang bật. */
export function AiButton() {
  const allowed = useCan(HEADS)
  const { pathname } = useLocation()
  const status = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: getStatus,
    enabled: allowed,
    staleTime: 5 * 60_000,
    retry: false,
  })
  if (!allowed || !status.data?.enabled) return null
  const active = pathname.startsWith('/assistant')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            'h-10 gap-2 rounded-full border pr-4 pl-1.5 font-semibold',
            active
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-card text-foreground hover:bg-muted',
          )}
          data-testid="ai-header-button"
        >
          <Link to="/assistant" aria-label="Trợ lý AI">
            <span className="bg-success flex size-7 items-center justify-center rounded-full text-white dark:text-background">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <span className="hidden md:inline">AI Assistant</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Trợ lý AI — hỏi về máy, vật tư, sửa chữa</TooltipContent>
    </Tooltip>
  )
}
