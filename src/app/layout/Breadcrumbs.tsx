import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useMatches } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { findMenuItem } from '@/routes/menu'

export interface CrumbHandle {
  crumb?: string | ((data: unknown) => string)
}

export function Breadcrumbs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const matches = useMatches()
  const found = findMenuItem(pathname)

  const crumbs: { label: string; to?: string }[] = []
  if (found) {
    if (found.group) crumbs.push({ label: t(found.group.labelKey) })
    const isLeaf = pathname === found.item.path
    crumbs.push({ label: t(found.item.labelKey), to: isLeaf ? undefined : found.item.path })
  }
  // Trang chi tiết có thể khai `handle.crumb` để thêm mức cuối.
  for (const m of matches) {
    const h = m.handle as CrumbHandle | undefined
    if (!h?.crumb) continue
    const label = typeof h.crumb === 'function' ? h.crumb(m.data) : h.crumb
    if (label && crumbs[crumbs.length - 1]?.label !== label) crumbs.push({ label })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {pathname === '/' ? (
            <BreadcrumbPage>{t('breadcrumb.home')}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to="/">{t('breadcrumb.home')}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {pathname !== '/' &&
          crumbs.map((c, i) => {
            const last = i === crumbs.length - 1
            return (
              <Fragment key={`${c.label}-${i}`}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {last ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : c.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={c.to}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
