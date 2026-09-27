import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { SectionCard } from '@/components/page/SectionCard'
import { formatDateTime } from '@/lib/format/date'
import { listSignedDocuments, signingKeys, type SignSlot, type SignedDocument } from '../api'
import { SignDialog } from './SignDialog'
import '../i18n'

interface PanelProps {
  docType: string
  id: string
  /** Nút phụ ở góc phải tiêu đề (ví dụ nút mở hộp thoại ký). */
  actions?: React.ReactNode
}

function SignedList({ docType, id }: { docType: string; id: string }) {
  const { t } = useTranslation('signing')
  const query = useQuery({
    queryKey: signingKeys.signed(docType, id),
    queryFn: () => listSignedDocuments(docType, id),
  })

  if (query.isPending) {
    return <p className="text-muted-foreground py-6 text-sm">{t('common:page.loading')}</p>
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  const rows = query.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        title={t('signedEmpty')}
        description={t('signedEmptyDesc')}
      />
    )
  }
  return (
    <ul className="divide-divider divide-y">
      {rows.map((row: SignedDocument) => (
        <li key={row.attachmentId} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.label || row.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {t('signedAt')}: {formatDateTime(row.signedAt)} · {row.name}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={row.url} target="_blank" rel="noreferrer">
              <Download aria-hidden />
              {t('download')}
            </a>
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Khối "Bản đã ký" đặt ở màn chi tiết chứng từ (chỉ danh sách + tải về). */
export function SignedDocumentsPanel({ docType, id, actions }: PanelProps) {
  const { t } = useTranslation('signing')
  return (
    <SectionCard title={t('signedTitle')} actions={actions} bodyClassName="pt-2">
      <SignedList docType={docType} id={id} />
    </SectionCard>
  )
}

/**
 * Khối gộp cho màn chứng từ: nút "Ký số" + hộp thoại ký + danh sách bản đã ký.
 * Dùng lại được ở mọi màn bằng props `{ docType, id, slots }`.
 */
export function DocumentSigningCard({
  docType,
  id,
  slots,
}: {
  docType: string
  id: string
  slots: readonly SignSlot[]
}) {
  return (
    <SignedDocumentsPanel
      docType={docType}
      id={id}
      actions={<SignDialog docType={docType} id={id} slots={slots} />}
    />
  )
}
