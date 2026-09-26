import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'

export function Component() {
  const { t } = useTranslation('settings')
  return (
    <>
      <PageHeader
        title={t('backup.title')}
        description={t('backupHint', { defaultValue: 'Sao lưu và khôi phục dữ liệu của viện.' })}
      />
      <SectionCard>
        <p className="text-muted-foreground max-w-xl text-sm">
          {/* TODO(api): Tenant API chưa có endpoint backup/restore. Sao lưu do SYS vận hành. */}
          {t('backup.description')}
        </p>
      </SectionCard>
    </>
  )
}
