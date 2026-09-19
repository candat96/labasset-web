import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
export function TemporaryPasswordDialog({
  password,
  onClose,
}: {
  password: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog
      open={!!password}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mật khẩu tạm</DialogTitle>
          <DialogDescription>
            Chỉ hiển thị một lần. Lưu lại và chuyển riêng cho người dùng.
          </DialogDescription>
        </DialogHeader>
        <code className="bg-muted break-all rounded p-3 text-base select-all">{password}</code>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(password ?? '')
              setCopied(true)
            } catch {
              toast.error('Không sao chép được. Hãy chọn và sao chép mật khẩu.')
            }
          }}
        >
          {copied ? 'Đã sao chép' : 'Sao chép'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setCopied(false)
            onClose()
          }}
        >
          Đã lưu, đóng
        </Button>
      </DialogContent>
    </Dialog>
  )
}
