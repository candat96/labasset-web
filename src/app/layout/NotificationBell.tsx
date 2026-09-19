import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** Sẽ thay bằng bản đầy đủ ở feature notifications (Task 8). */
export function NotificationBell() {
  const { t } = useTranslation()
  return (
    <Button variant="ghost" size="icon" aria-label={t('menu:items.notifications')}>
      <Bell className="size-4" aria-hidden />
    </Button>
  )
}
