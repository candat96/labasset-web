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
            'gap-1.5 rounded-full px-3 font-semibold',
            active
              ? 'bg-primary-soft text-primary'
              : 'bg-brand-gradient text-white hover:opacity-90 hover:text-white',
          )}
          data-testid="ai-header-button"
        >
          <Link to="/assistant" aria-label="Trợ lý AI">
            <Sparkles className="size-4" aria-hidden />
            <span className="hidden md:inline">Hỏi AI</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Trợ lý AI — hỏi về máy, vật tư, sửa chữa</TooltipContent>
    </Tooltip>
  )
}
