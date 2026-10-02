import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { MoneyField } from '@/components/form/money-field'
import { formatVnd } from '@/lib/format/money'
import { messageFor } from '@/api/errors'
import { addTaskCost, listTaskCosts, removeTaskCost } from '../api'

const CATEGORIES = ['parts', 'labor', 'service', 'transport', 'other'] as const

const schema = z.object({
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(1),
  amount: z.string().regex(/^(0|[1-9]\d{0,17})$/),
  invoiceNo: z.string(),
})
type Values = z.infer<typeof schema>

/**
 * Chi phí của một công việc bảo dưỡng.
 *
 * Nhiều khoản chứ không một ô tổng: bảo dưỡng thuê ngoài thường tách công, vật tư
 * và đi lại, mỗi khoản một hoá đơn riêng.
 */
export function TaskCosts({ taskId, canWrite }: { taskId: string; canWrite: boolean }) {
  const { t } = useTranslation('maintenance')
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const costs = useQuery({
    queryKey: ['maintenance', 'costs', taskId],
    queryFn: () => listTaskCosts(taskId),
  })
  const rows = (costs.data ?? []) as {
    id: string
    category: string
    description: string
    amount: string
    invoiceNo?: string | null
  }[]
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'service', description: '', amount: '', invoiceNo: '' },
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['maintenance', 'costs', taskId] })
  const remove = useMutation({
    mutationFn: (costId: string) => removeTaskCost(taskId, costId),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(messageFor(error)),
  })

  const total = rows.reduce((sum, row) => sum + BigInt(row.amount || '0'), 0n)

  return (
    <SectionCard
      title={t('costs')}
      actions={
        canWrite && (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {t('addCost')}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyState title={t('noCosts')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('costCategory')}</TableHead>
              <TableHead>{t('costDescription')}</TableHead>
              <TableHead>{t('invoiceNo')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
              {canWrite && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{t(`costCategories.${row.category}`)}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.invoiceNo || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.amount)}</TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('removeCost')}
                      onClick={() => remove.mutate(row.id)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="font-medium">
                {t('totalCost')}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatVnd(String(total))}
              </TableCell>
              {canWrite && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      )}

      {adding && (
        <FormDialog
          open
          onOpenChange={(v) => !v && setAdding(false)}
          title={t('addCost')}
          form={form}
          onSubmit={async (values) => {
            try {
              await addTaskCost(taskId, {
                category: values.category,
                description: values.description,
                amount: values.amount,
                invoiceNo: values.invoiceNo || null,
              })
              toast.success(t('costSaved'))
              form.reset()
              setAdding(false)
              await invalidate()
            } catch (error) {
              toast.error(messageFor(error))
            }
          }}
        >
          <SelectField
            control={form.control}
            name="category"
            label={t('costCategory')}
            required
            options={CATEGORIES.map((value) => ({
              value,
              label: t(`costCategories.${value}`),
            }))}
          />
          <TextField
            control={form.control}
            name="description"
            label={t('costDescription')}
            required
          />
          <MoneyField control={form.control} name="amount" label={t('amount')} required />
          <TextField control={form.control} name="invoiceNo" label={t('invoiceNo')} />
        </FormDialog>
      )}
    </SectionCard>
  )
}
