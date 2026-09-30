import { useTranslation } from 'react-i18next'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { downloadEquipmentTemplate, importEquipment } from '../api'

/**
 * Nhập hồ sơ thiết bị từ Excel. Dòng lỗi (vd `departmentCode` không tồn tại) không
 * được ghi; các dòng còn lại đã vào — sửa tệp rồi nhập lại thay vì nhập lại từ đầu.
 */
export function EquipmentImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}) {
  const { t } = useTranslation('equipment')
  return (
    <ExcelImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('import.title')}
      description={t('import.desc')}
      templateLabel={t('import.template')}
      onDownloadTemplate={() => downloadEquipmentTemplate()}
      fileLabel={t('import.file')}
      submitLabel={t('import.submit')}
      importingLabel={t('import.importing')}
      wrongTypeMessage={t('import.wrongType')}
      tooLargeMessage={t('import.tooLarge')}
      onImport={(file) => importEquipment(file)}
      onImported={onImported}
    />
  )
}
