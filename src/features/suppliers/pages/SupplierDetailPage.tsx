import { useState } from 'react'
import { useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Mail, MapPin, Pencil, Phone, Plus, Star, Trash2, User } from 'lucide-react'
import { DetailLayout } from '@/components/detail-layout'
import { AuditTrail } from '@/components/audit-trail'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { SectionCard } from '@/components/page/SectionCard'
import { PageMeta } from '@/components/page/PageHeader'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/confirm-dialog'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { trimDecimal } from '@/lib/format/number'
import { getCatalog } from '@/features/catalogs/api'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { messageFor } from '@/api/errors'
import { deleteSupplierEvaluation, listSupplierEvaluations } from '../api'
import { EVALUATION_SCORES, type SupplierEvaluation } from '../types'
import { EvaluationFormDialog } from '../components/EvaluationFormDialog'

function ScoreChips({ row }: { row: SupplierEvaluation }) {
  const { t } = useTranslation('suppliers')
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {EVALUATION_SCORES.map((key) => (
        <div key={key}>
          <div className="text-muted-foreground text-[12.5px] leading-4 font-medium">
            {t(`scores.${key}`)}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{row[key]}</div>
        </div>
      ))}
    </div>
  )
}

function EvaluationCard({
  row,
  canWrite,
  onEdit,
  onDelete,
}: {
  row: SupplierEvaluation
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('suppliers')
  return (
    <li className="bg-card shadow-card rounded-md p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold">
            {t('period', { from: formatDate(row.periodFrom), to: formatDate(row.periodTo) })}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[12.5px]">
            {t('evaluatedAt')}: {formatDate(row.evaluatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary-soft text-primary rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums">
            {trimDecimal(row.totalScore)}
          </span>
          {canWrite && (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('editEvaluation')}
                onClick={onEdit}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                aria-label={t('common:actions.delete')}
                onClick={onDelete}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="border-divider mt-3 border-t pt-3">
        <ScoreChips row={row} />
      </div>
      {row.note && <p className="text-muted-foreground mt-3 text-sm">{row.note}</p>}
    </li>
  )
}

export function Component() {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation('catalogs')
  const { id = '' } = useParams()
  const canWrite = useCan(STAFF)
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierEvaluation | undefined>()

  const supplier = useQuery({
    queryKey: ['catalogs', 'suppliers', 'detail', id],
    queryFn: () => getCatalog('suppliers', id),
  })
  const evaluations = useQuery({
    queryKey: ['supplier-evaluations', id],
    queryFn: () => listSupplierEvaluations(id),
  })
  const remove = useMutation({
    mutationFn: (evaluationId: string) => deleteSupplierEvaluation(id, evaluationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier-evaluations', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalogs', 'suppliers'] })
      toast.success(t('deleted'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  if (supplier.isPending) return <DetailSkeleton label={t('loadingDetail')} />
  if (supplier.error)
    return <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />
  const row = supplier.data

  return (
    <>
      <DetailLayout
        code={row.code}
        name={row.name}
        eyebrow={tc('titles.suppliers')}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        meta={
          <>
            <PageMeta icon={<Star />}>
              {row.rating == null ? t('ratingNone') : `${t('ratingCurrent')}: ${row.rating}`}
            </PageMeta>
            {row.contactName && <PageMeta icon={<User />}>{String(row.contactName)}</PageMeta>}
            {row.phone && <PageMeta icon={<Phone />}>{String(row.phone)}</PageMeta>}
            {row.email && <PageMeta icon={<Mail />}>{String(row.email)}</PageMeta>}
            {row.address && <PageMeta icon={<MapPin />}>{String(row.address)}</PageMeta>}
          </>
        }
        information={
          <>
            <h2 className="mb-3 text-[15px] leading-6 font-semibold">{t('info')}</h2>
            <DataList
              columns={1}
              items={[
                { label: t('ratingCurrent'), value: row.rating ?? t('ratingNone') },
                { label: t('taxCode'), value: row.taxCode },
                { label: t('phone'), value: row.phone },
                { label: t('email'), value: row.email },
                { label: t('contactName'), value: row.contactName },
              ]}
            />
            <p className="text-muted-foreground mt-3 text-[12.5px] leading-4">{t('ratingHint')}</p>
          </>
        }
        tabs={[
          {
            value: 'evaluations',
            label: t('evaluations'),
            count: evaluations.data?.length,
            content: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-muted-foreground max-w-2xl text-[14px] leading-5">
                    {t('evaluationsHint')}
                  </p>
                  {canWrite && (
                    <Button
                      onClick={() => {
                        setEditing(undefined)
                        setFormOpen(true)
                      }}
                    >
                      <Plus />
                      {t('addEvaluation')}
                    </Button>
                  )}
                </div>
                {evaluations.isPending ? (
                  <div className="bg-muted/60 h-24 animate-pulse rounded-md" />
                ) : evaluations.error ? (
                  <ErrorState
                    error={evaluations.error}
                    onRetry={() => void evaluations.refetch()}
                  />
                ) : !evaluations.data || evaluations.data.length === 0 ? (
                  <EmptyState icon={Star} title={t('empty')} description={t('emptyHint')} />
                ) : (
                  <ul className="space-y-3">
                    {evaluations.data.map((item) => (
                      <EvaluationCard
                        key={item.id}
                        row={item}
                        canWrite={canWrite}
                        onEdit={() => {
                          setEditing(item)
                          setFormOpen(true)
                        }}
                        onDelete={async () => {
                          if (
                            (await confirm({
                              title: t('deleteEvaluation'),
                              description: t('deleteEvaluationDesc'),
                              destructive: true,
                            })) !== false
                          )
                            remove.mutate(item.id)
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            value: 'info',
            label: t('info'),
            content: (
              <SectionCard title={t('info')}>
                <DataList
                  columns={2}
                  items={[
                    { label: t('taxCode'), value: row.taxCode },
                    { label: t('phone'), value: row.phone },
                    { label: t('email'), value: row.email },
                    { label: t('contactName'), value: row.contactName },
                    { label: t('contactPhone'), value: row.contactPhone },
                    {
                      label: tc('catalogFields.suppliers.maintenanceContractNo'),
                      value: row.maintenanceContractNo,
                    },
                    {
                      label: tc('catalogFields.suppliers.maintenanceContractExpiresAt'),
                      value: row.maintenanceContractExpiresAt
                        ? formatDate(String(row.maintenanceContractExpiresAt))
                        : null,
                    },
                    { label: t('address'), value: row.address, full: true },
                    { label: t('notes'), value: row.notes, full: true },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            value: 'audit',
            label: t('audit'),
            content: (
              <SectionCard title={t('audit')}>
                <AuditTrail entityType="suppliers" entityId={id} />
              </SectionCard>
            ),
          },
        ]}
      />
      <EvaluationFormDialog
        supplierId={id}
        row={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      {dialog}
    </>
  )
}
