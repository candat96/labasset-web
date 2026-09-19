import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download, Loader2, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { messageFor } from '@/api/errors'
import { downloadDepartmentTemplate } from '../api'
import { useImportDepartments } from '../hooks'
import type { ImportResult } from '../types'

const MAX_SIZE = 5 * 1024 * 1024
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('departments')
  const { t: tc } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const importMut = useImportDepartments()

  const reset = () => {
    setFile(null)
    setFileError(null)
    setResult(null)
  }

  const pick = (f: File | null) => {
    setResult(null)
    if (!f) return setFile(null)
    if (!f.name.toLowerCase().endsWith('.xlsx') && f.type !== XLSX_MIME) {
      setFileError(t('import.wrongType'))
      return setFile(null)
    }
    if (f.size > MAX_SIZE) {
      setFileError(t('import.tooLarge'))
      return setFile(null)
    }
    setFileError(null)
    setFile(f)
  }

  const submit = async () => {
    if (!file) return
    try {
      const r = await importMut.mutateAsync(file)
      setResult(r)
      if (r.errors.length === 0)
        toast.success(t('import.result', { created: r.created, updated: r.updated }))
    } catch (e) {
      toast.error(messageFor(e))
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t('import.step1')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => downloadDepartmentTemplate().catch((e) => toast.error(messageFor(e)))}
          >
            <Download aria-hidden /> {t('import.template')}
          </Button>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{t('import.step2')}</p>
            <Label htmlFor="import-file">{t('import.file')}</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx"
              aria-describedby="import-file-error"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
            {fileError && (
              <p id="import-file-error" role="alert" className="text-destructive text-sm">
                {fileError}
              </p>
            )}
          </div>
          {result && result.errors.length === 0 && (
            <Alert>
              <AlertDescription>
                {t('import.result', { created: result.created, updated: result.updated })}
              </AlertDescription>
            </Alert>
          )}
          {result && result.errors.length > 0 && (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>
                  {t('import.errors', { count: result.errors.length })}
                </AlertDescription>
              </Alert>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t('import.row')}</TableHead>
                      <TableHead className="w-32">{t('import.field')}</TableHead>
                      <TableHead>{t('import.message')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell>{e.field ?? '—'}</TableCell>
                        <TableCell>{e.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.close')}
          </Button>
          <Button onClick={() => void submit()} disabled={!file || importMut.isPending}>
            {importMut.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Upload aria-hidden />
            )}
            {t('import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
