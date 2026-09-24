import type { ComponentProps, ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const tones = {
  edit: 'bg-primary-soft text-primary hover:bg-primary/15 hover:text-primary',
  delete: 'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive',
} as const

function IconAction({
  label,
  tone,
  icon,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  label: string
  tone: keyof typeof tones
  icon: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          {...props}
          aria-label={label}
          className={cn(tones[tone], className)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function EditIconButton(props: ComponentProps<typeof Button>) {
  const { t } = useTranslation()
  return <IconAction label={t('actions.edit')} tone="edit" icon={<Pencil />} {...props} />
}

export function DeleteIconButton(props: ComponentProps<typeof Button>) {
  const { t } = useTranslation()
  return <IconAction label={t('actions.delete')} tone="delete" icon={<Trash2 />} {...props} />
}
