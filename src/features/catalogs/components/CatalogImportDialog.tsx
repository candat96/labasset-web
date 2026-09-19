import { useState } from 'react'
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
          <DialogTitle>Nhập danh mục từ Excel</DialogTitle>
          <DialogDescription>Tải tệp mẫu, điền dữ liệu rồi chọn tệp để nhập.</DialogDescription>
        </DialogHeader>
        <Button variant="outline" onClick={() => void downloadCatalogTemplate(slug)}>
          Tải tệp mẫu
        </Button>
        <Input
          aria-label="Tệp Excel"
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {result && (
          <div>
            <p>
              Tạo mới: {result.created} · Cập nhật: {result.updated} · Lỗi: {result.errors.length}
            </p>
            {result.errors.length > 0 && (
              <div className="max-h-64 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Trường</th>
                      <th>Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((error, index) => (
                      <tr key={`${error.row}-${index}`}>
                        <td>{error.row}</td>
                        <td>{error.field ?? '—'}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            disabled={!file || mutation.isPending}
            onClick={() => file && mutation.mutate(file)}
          >
            Nhập Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
