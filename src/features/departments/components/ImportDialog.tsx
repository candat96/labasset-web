import { useTranslation } from 'react-i18next'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { downloadDepartmentTemplate } from '../api'
import { useImportDepartments } from '../hooks'

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('departments')
  const importMut = useImportDepartments()
  return (
    <ExcelImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('import.title')}
      description={t('import.step1')}
      notice={<p className="text-muted-foreground text-sm">{t('import.step2')}</p>}
      templateLabel={t('import.template')}
      onDownloadTemplate={() => downloadDepartmentTemplate()}
      fileLabel={t('import.file')}
      submitLabel={t('import.submit')}
      importingLabel={t('import.importing')}
      wrongTypeMessage={t('import.wrongType')}
      tooLargeMessage={t('import.tooLarge')}
      onImport={(file) => importMut.mutateAsync(file)}
    />
  )
}
