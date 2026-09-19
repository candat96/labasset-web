import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page/PageHeader'
import { EmptyState } from '@/components/page/EmptyState'

/** Trang giữ chỗ cho mọi mục menu chưa triển khai. */
export function PlaceholderPage({ nameKey }: { nameKey: string }) {
  const { t } = useTranslation()
  const name = t(nameKey)
  return (
    <>
      <PageHeader title={name} />
      <Card>
        <CardContent>
          <EmptyState
            icon={Construction}
            title={t('page.placeholder')}
            description={t('page.placeholderDesc', { name })}
          />
        </CardContent>
      </Card>
    </>
  )
}
