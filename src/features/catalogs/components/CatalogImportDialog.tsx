import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { downloadCatalogTemplate, importCatalog } from '../api'
import type { CatalogSlug } from '../types'

export function CatalogImportDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: CatalogSlug
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('catalogs')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: File) => importCatalog(slug, value),
  })
  return (
    <ExcelImportDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
      title={t('import.title')}
      description={t('import.step1')}
      notice={<p className="text-muted-foreground text-xs">{t('import.codeNote')}</p>}
      templateLabel={t('import.template')}
      onDownloadTemplate={() => downloadCatalogTemplate(slug)}
      fileLabel={t('import.file')}
      submitLabel={tc('actions.import')}
      importingLabel={t('import.importing')}
      wrongTypeMessage={t('import.wrongType')}
      tooLargeMessage={t('import.tooLarge')}
      onImport={(file) => mutation.mutateAsync(file)}
      onImported={() => void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })}
    />
  )
}
