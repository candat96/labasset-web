import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { messageFor } from '@/api/errors'
import { downloadCatalogTemplate, importCatalog } from '../api'
import type { CatalogSlug, ImportResult } from '../types'

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
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: File) => importCatalog(slug, value),
    onSuccess: (value) => {
      setResult(value)
      void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value)
        if (!value) {
          setFile(null)
          setResult(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t('import.step1')}</DialogDescription>
        </DialogHeader>
        <Button variant="outline" onClick={() => void downloadCatalogTemplate(slug)}>
          {t('import.template')}
        </Button>
        <Input
          aria-label={t('import.file')}
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {result && (
          <div>
            <p>
              {t('import.result', {
                created: result.created,
                updated: result.updated,
                errors: result.errors.length,
              })}
            </p>
            {result.errors.length > 0 && (
              <div className="border-divider max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('import.row')}</TableHead>
                      <TableHead>{t('import.field')}</TableHead>
                      <TableHead>{t('import.error')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error, index) => (
                      <TableRow key={`${error.row}-${index}`}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>{error.field ?? '—'}</TableCell>
                        <TableCell>{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.close')}
          </Button>
          <Button
            disabled={!file || mutation.isPending}
            onClick={() => file && mutation.mutate(file)}
          >
            {tc('actions.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
