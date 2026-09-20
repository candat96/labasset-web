import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'

export function Component() {
  const { t } = useTranslation('settings')
  return (
    <>
      <PageHeader title={t('backup.title')} />
      <p className="text-muted-foreground max-w-xl text-sm">
        {/* TODO(api): Tenant API chưa có endpoint backup/restore. Sao lưu do SYS vận hành. */}
        {t('backup.description')}
      </p>
    </>
  )
}
