import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { importedCount, type ImportResultData } from '@/api/import-result'

/**
 * Kết quả nhập Excel hiển thị nhất quán cho mọi màn: nói rõ số dòng ĐÃ NHẬP và số
 * dòng LỖI, kèm bảng dòng lỗi để sửa rồi nhập lại. Dòng lỗi không được ghi, các
 * dòng khác đã vào hệ thống — nhập lại toàn bộ sẽ gây trùng.
 */
export function ImportResultPanel({
  result,
  className,
}: {
  result: ImportResultData
  className?: string
}) {
  const { t } = useTranslation()
  const imported = importedCount(result)
  const errorCount = result.errors.length
  return (
    <div className={className ?? 'space-y-2'} data-testid="import-result">
      <p className="font-medium tabular-nums">
        {errorCount > 0
          ? t('importResult.summary', { imported, errors: errorCount })
          : t('importResult.summaryClean', { imported })}
      </p>
      <p className="text-muted-foreground text-sm">
        {t('importResult.breakdown', { created: result.created, updated: result.updated })}
      </p>
      {result.createdCodes && result.createdCodes.length > 0 && (
        <p className="text-success-fg text-sm">
          {t('importResult.generatedCodes', { codes: result.createdCodes.join(', ') })}
        </p>
      )}
      {errorCount > 0 && (
        <>
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertDescription>{t('importResult.errorsNotImported')}</AlertDescription>
          </Alert>
          <div className="border-divider max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t('importResult.row')}</TableHead>
                  <TableHead className="w-32">{t('importResult.field')}</TableHead>
                  <TableHead>{t('importResult.message')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((error, index) => (
                  <TableRow key={`${error.row}-${index}`}>
                    <TableCell className="tabular-nums">{error.row}</TableCell>
                    <TableCell>{error.field ?? '—'}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
