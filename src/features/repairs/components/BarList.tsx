import { useTranslation } from 'react-i18next'

export function BarList({
  items,
  ariaLabel,
}: {
  items: { label: string; value: number; hint?: string }[]
  ariaLabel: string
}) {
  const { t } = useTranslation()
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex justify-between gap-2 text-[13px]">
            <span className="truncate font-medium">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">{item.hint ?? item.value}</span>
          </div>
          <svg viewBox="0 0 100 8" className="text-primary h-2 w-full" aria-hidden>
            <rect width="100" height="8" className="fill-muted" rx="2" />
            <rect width={(item.value / max) * 100} height="8" className="fill-current" rx="2" />
          </svg>
        </li>
      ))}
      {items.length === 0 && <li className="text-muted-foreground text-sm">{t('table.empty')}</li>}
    </ul>
  )
}
