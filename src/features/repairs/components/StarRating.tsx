import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Đánh giá 1–5 sao (nghiệm thu). */
export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('repairs')
  return (
    <div
      role="radiogroup"
      aria-label={t('detail.acceptance.rating')}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t('detail.acceptance.ratingValue', { n: star })}
          disabled={disabled}
          className="rounded p-0.5 disabled:opacity-50"
          onClick={() => onChange(star)}
        >
          <Star
            aria-hidden
            className={cn(
              'size-6',
              star <= (value ?? 0) ? 'fill-warning text-warning' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  )
}
