import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImportResultPanel } from '@/components/import-result-panel'
import { messageFor } from '@/api/errors'
import { importedCount, type ImportResultData } from '@/api/import-result'

const MAX_SIZE = 5 * 1024 * 1024
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Hộp thoại nhập Excel dùng chung: chọn tệp (chỉ .xlsx, tối đa 5 MB), tải mẫu,
 * nhập rồi hiển thị kết quả từng phần qua `ImportResultPanel`.
 *
 * `onImport` trả kết quả thật của API (có thể vừa ghi được dòng vừa có dòng lỗi);
 * `onImported` dùng để làm mới danh sách sau khi ghi được ít nhất một dòng.
 */
export function ExcelImportDialog({
  open,
  onOpenChange,
  title,
  description,
  notice,
  templateLabel,
  onDownloadTemplate,
  fileLabel,
  submitLabel,
  importingLabel,
  wrongTypeMessage,
  tooLargeMessage,
  onImport,
  onImported,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  notice?: ReactNode
  templateLabel: string
  onDownloadTemplate: () => Promise<void> | void
  fileLabel: string
  submitLabel: string
  importingLabel?: string
  wrongTypeMessage: string
  tooLargeMessage: string
  onImport: (file: File) => Promise<ImportResultData>
  onImported?: (result: ImportResultData) => void
  className?: string
}) {
  const { t: tc } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResultData | null>(null)
  const [pending, setPending] = useState(false)

  const reset = () => {
    setFile(null)
    setFileError(null)
    setResult(null)
    setPending(false)
  }

  const pick = (f: File | null) => {
    setResult(null)
    if (!f) return setFile(null)
    if (!f.name.toLowerCase().endsWith('.xlsx') && f.type !== XLSX_MIME) {
      setFileError(wrongTypeMessage)
      return setFile(null)
    }
    if (f.size > MAX_SIZE) {
      setFileError(tooLargeMessage)
      return setFile(null)
    }
    setFileError(null)
    setFile(f)
  }

  const submit = async () => {
    if (!file || pending) return
    setPending(true)
    try {
      const r = await onImport(file)
      setResult(r)
      if (r.errors.length === 0) {
        toast.success(tc('importResult.summaryClean', { imported: importedCount(r) }))
      } else {
        toast.warning(
          tc('importResult.summary', {
            imported: importedCount(r),
            errors: r.errors.length,
          }),
        )
      }
      if (importedCount(r) > 0) onImported?.(r)
    } catch (e) {
      toast.error(messageFor(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className={className ?? 'sm:max-w-xl'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await onDownloadTemplate()
              } catch (e) {
                toast.error(messageFor(e))
              }
            }}
          >
            <Download aria-hidden /> {templateLabel}
          </Button>
          {notice}
          <div className="space-y-2">
            <Label htmlFor="excel-import-file">{fileLabel}</Label>
            <Input
              id="excel-import-file"
              type="file"
              accept=".xlsx"
              aria-describedby="excel-import-file-error"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
            {fileError && (
              <p id="excel-import-file-error" role="alert" className="text-destructive text-sm">
                {fileError}
              </p>
            )}
          </div>
          {result && <ImportResultPanel result={result} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.close')}
          </Button>
          <Button onClick={() => void submit()} disabled={!file || pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {pending && importingLabel ? importingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
