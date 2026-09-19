import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/page/PageHeader'
import { ConfirmDialog } from '@/components/page/ConfirmDialog'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { formatDateTime, formatRelative } from '@/lib/format/date'
import { useLogoutAll, useRevokeSession, useSessions } from '../hooks'

export function Component() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const sessions = useSessions()
  const revoke = useRevokeSession()
  const logoutAll = useLogoutAll()
  const [target, setTarget] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  return (
    <>
      <PageHeader
        title={t('sessions.title')}
        description={t('sessions.desc')}
        actions={
          <Button variant="destructive" onClick={() => setConfirmAll(true)}>
            <LogOut aria-hidden /> {t('sessions.revokeAll')}
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          {sessions.isPending ? (
            <div className="space-y-2 p-4" aria-busy>
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
          ) : sessions.data.length === 0 ? (
            <EmptyState title={t('sessions.empty')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sessions.device')}</TableHead>
                  <TableHead>{t('sessions.ip')}</TableHead>
                  <TableHead>{t('sessions.createdAt')}</TableHead>
                  <TableHead>{t('sessions.lastUsedAt')}</TableHead>
                  <TableHead>{t('sessions.expiresAt')}</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-72 truncate">
                      {s.deviceInfo ?? t('sessions.unknownDevice')}
                    </TableCell>
                    <TableCell>{s.ip ?? '—'}</TableCell>
                    <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell>{s.lastUsedAt ? formatRelative(s.lastUsedAt) : '—'}</TableCell>
                    <TableCell>{formatDateTime(s.expiresAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setTarget(s.id)}>
                        {t('sessions.revoke')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={t('sessions.revokeTitle')}
        description={t('sessions.revokeDesc')}
        confirmLabel={t('sessions.revoke')}
        destructive
        loading={revoke.isPending}
        onConfirm={() => {
          if (target) revoke.mutate(target, { onSettled: () => setTarget(null) })
        }}
      />
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t('sessions.revokeAllTitle')}
        description={t('sessions.revokeAllDesc')}
        confirmLabel={tc('actions.confirm')}
        destructive
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </>
  )
}
