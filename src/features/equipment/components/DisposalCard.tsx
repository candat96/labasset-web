import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { DataList } from '@/components/page/DataList'
import { StatusBadge } from '@/components/page/StatusBadge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField, TextAreaField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { formatDate } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { messageFor } from '@/api/errors'
import { createDisposal, listDisposals, updateDisposal } from '../api'

const REASONS = [
  'expired_life',
  'beyond_repair',
  'uneconomical',
  'no_longer_needed',
  'other',
] as const
const METHODS = ['sell', 'destroy', 'transfer', 'other'] as const
const SALE_METHODS = ['auction', 'listed_price', 'designated'] as const

const schema = z.object({
  reason: z.enum(REASONS),
  method: z.union([z.enum(METHODS), z.literal('')]),
  saleMethod: z.union([z.enum(SALE_METHODS), z.literal('')]),
  decisionAuthority: z.string(),
  councilNo: z.string(),
  assessedAt: z.string(),
  assessment: z.string(),
  decisionNo: z.string(),
  decisionDate: z.string(),
  recoveredAmount: z.string(),
  completedAt: z.string(),
  note: z.string(),
})
type Values = z.infer<typeof schema>

type Disposal = {
  id: string
  status: 'draft' | 'approved' | 'done'
  reason: string
  method?: string | null
  saleMethod?: string | null
  decisionAuthority?: string | null
  councilNo?: string | null
  assessedAt?: string | null
  assessment?: string | null
  decisionNo?: string | null
  decisionDate?: string | null
  recoveredAmount?: string
  completedAt?: string | null
  note?: string | null
}

/**
 * Hồ sơ thanh lý thiết bị: quyết định, hội đồng, hình thức xử lý và số tiền thu
 * về — những thứ đoàn kiểm tra hỏi mà trạng thái "đã thanh lý" không trả lời được.
 */
export function DisposalCard({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const list = useQuery({
    queryKey: ['equipment', id, 'disposals'],
    queryFn: () => listDisposals(id),
  })
  const rows = (list.data ?? []) as Disposal[]
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: 'expired_life',
      method: '',
      saleMethod: '',
      decisionAuthority: '',
      councilNo: '',
      assessedAt: '',
      assessment: '',
      decisionNo: '',
      decisionDate: '',
      recoveredAmount: '',
      completedAt: '',
      note: '',
    },
  })
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['equipment', id, 'disposals'] })
    void qc.invalidateQueries({ queryKey: ['equipment', id] })
  }
  const close = useMutation({
    mutationFn: (disposalId: string) => updateDisposal(id, disposalId, { status: 'done' }),
    onSuccess: () => {
      toast.success(t('disposal.closed'))
      invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  return (
    <SectionCard
      title={t('disposal.title')}
      description={t('disposal.hint')}
      actions={
        canWrite &&
        !rows.some((row) => row.status !== 'done') && (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {t('disposal.add')}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyState title={t('disposal.empty')} />
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <div key={row.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={
                    row.status === 'done'
                      ? 'success'
                      : row.status === 'approved'
                        ? 'info'
                        : 'warning'
                  }
                  label={t(`disposal.status.${row.status}`)}
                />
                {canWrite && row.status !== 'done' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={close.isPending}
                    onClick={() => close.mutate(row.id)}
                  >
                    {t('disposal.finish')}
                  </Button>
                )}
              </div>
              <DataList
                columns={2}
                items={[
                  { label: t('disposal.reason'), value: t(`disposal.reasons.${row.reason}`) },
                  {
                    label: t('disposal.method'),
                    value: row.method ? t(`disposal.methods.${row.method}`) : null,
                  },
                  {
                    label: t('disposal.saleMethod'),
                    value: row.saleMethod ? t(`disposal.saleMethods.${row.saleMethod}`) : null,
                  },
                  { label: t('disposal.councilNo'), value: row.councilNo },
                  { label: t('disposal.assessedAt'), value: formatDate(row.assessedAt) || null },
                  { label: t('disposal.decisionNo'), value: row.decisionNo },
                  {
                    label: t('disposal.decisionAuthority'),
                    value: row.decisionAuthority,
                  },
                  {
                    label: t('disposal.decisionDate'),
                    value: formatDate(row.decisionDate) || null,
                  },
                  {
                    label: t('disposal.recoveredAmount'),
                    value: formatVnd(row.recoveredAmount) || null,
                  },
                  { label: t('disposal.completedAt'), value: formatDate(row.completedAt) || null },
                  { label: t('disposal.assessment'), value: row.assessment, full: true },
                  { label: t('disposal.note'), value: row.note, full: true },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {adding && (
        <FormDialog
          open
          onOpenChange={(value) => !value && setAdding(false)}
          title={t('disposal.add')}
          width="lg"
          form={form}
          onSubmit={async (values) => {
            try {
              await createDisposal(id, {
                reason: values.reason,
                method: values.method || null,
                saleMethod: values.saleMethod || null,
                decisionAuthority: values.decisionAuthority || null,
                councilNo: values.councilNo || null,
                assessedAt: values.assessedAt || null,
                assessment: values.assessment || null,
                decisionNo: values.decisionNo || null,
                decisionDate: values.decisionDate || null,
                recoveredAmount: values.recoveredAmount || undefined,
                completedAt: values.completedAt || null,
                note: values.note || null,
              })
              toast.success(t('disposal.created'))
              form.reset()
              setAdding(false)
              invalidate()
            } catch (error) {
              toast.error(messageFor(error))
            }
          }}
        >
          <SelectField
            control={form.control}
            name="reason"
            label={t('disposal.reason')}
            required
            options={REASONS.map((value) => ({
              value,
              label: t(`disposal.reasons.${value}`),
            }))}
          />
          <SelectField
            control={form.control}
            name="method"
            label={t('disposal.method')}
            options={METHODS.map((value) => ({
              value,
              label: t(`disposal.methods.${value}`),
            }))}
          />
          <SelectField
            control={form.control}
            name="saleMethod"
            label={t('disposal.saleMethod')}
            options={SALE_METHODS.map((value) => ({
              value,
              label: t(`disposal.saleMethods.${value}`),
            }))}
          />
          <TextField control={form.control} name="councilNo" label={t('disposal.councilNo')} />
          <DateField control={form.control} name="assessedAt" label={t('disposal.assessedAt')} />
          <TextField control={form.control} name="decisionNo" label={t('disposal.decisionNo')} />
          <TextField
            control={form.control}
            name="decisionAuthority"
            label={t('disposal.decisionAuthority')}
          />
          <DateField
            control={form.control}
            name="decisionDate"
            label={t('disposal.decisionDate')}
          />
          <MoneyField
            control={form.control}
            name="recoveredAmount"
            label={t('disposal.recoveredAmount')}
          />
          <DateField control={form.control} name="completedAt" label={t('disposal.completedAt')} />
          <TextAreaField
            control={form.control}
            name="assessment"
            label={t('disposal.assessment')}
          />
          <TextAreaField control={form.control} name="note" label={t('disposal.note')} />
        </FormDialog>
      )}
    </SectionCard>
  )
}
