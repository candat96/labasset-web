import { useTranslation } from 'react-i18next'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { downloadSupplyTemplate, importSupplies } from '../api'

/** Nhập danh mục vật tư từ Excel; dòng lỗi không được ghi, các dòng khác đã vào. */
export function SupplyImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}) {
  const { t } = useTranslation('inventory')
  return (
    <ExcelImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('importTitle')}
      description={t('importDesc')}
      templateLabel={t('downloadTemplate')}
      onDownloadTemplate={() => downloadSupplyTemplate()}
      fileLabel={t('importFile')}
      submitLabel={t('importSubmit')}
      importingLabel={t('importing')}
      wrongTypeMessage={t('importWrongType')}
      tooLargeMessage={t('importTooLarge')}
      onImport={(file) => importSupplies(file)}
      onImported={onImported}
    />
  )
}
