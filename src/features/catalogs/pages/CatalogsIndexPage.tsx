import { Link } from 'react-router'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { listCatalog } from '../api'
import { catalogSlugs } from '../types'

export function Component() {
  const { t } = useTranslation('catalogs')
  const counts = useQueries({
    queries: catalogSlugs.map((slug) => ({
      queryKey: ['catalogs', slug, 'count'],
      queryFn: async () => {
        const result = await listCatalog(slug, { page: 1, limit: 1 })
        return Array.isArray(result) ? result.length : result.total
      },
      staleTime: 60_000,
    })),
  })
  return (
    <>
      <PageHeader title={t('index')} description={t('indexDesc')} />
      <SectionCard>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogSlugs.map((slug, index) => (
            <li key={slug}>
              <Link
                className="bg-surface-2 hover:bg-accent block rounded-lg p-4"
                to={`/admin/catalogs/${slug}`}
              >
                <h2 className="font-medium">{t(`titles.${slug}`)}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('count', { total: counts[index]?.data ?? '—' })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  )
}
