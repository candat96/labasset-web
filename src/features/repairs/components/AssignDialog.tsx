import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/components/form/FormDialog'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect, type ReferenceOption } from '@/components/form/async-select'
import { DatetimeField } from '@/components/form/datetime-field'
import { staffUserOptions } from '@/api/references'
import { applyServerErrors, messageFor } from '@/api/errors'
import * as api from '../api'
import { assignSchema, type AssignForm } from '../schema'

/**
 * Giao việc cho kỹ thuật viên.
 *
 * Số phiếu đang xử lý hiện **ngay trong từng dòng** của danh sách chọn, không còn
 * bày thành một danh sách riêng bên ngoài: người giao việc cần con số đó đúng lúc
 * đang chọn người, chứ không phải đọc ở một chỗ khác rồi tự nhớ.
 */
export function AssignDialog({
  id,
  equipmentId,
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    defaultValues: { primaryUserId: '', assistantIds: [], dueAt: '' },
  })
  const suggest = useQuery({
    queryKey: ['repairs', 'assign-suggest', equipmentId],
    queryFn: () => api.suggestAssignees(equipmentId),
  })
  const primaryUserId = form.watch('primaryUserId')

  /** Số phiếu đang mở của từng người, tra theo id. */
  const openTickets = new Map((suggest.data ?? []).map((row) => [row.id, row.openTickets] as const))
  const withTicketCount = (option: ReferenceOption): ReferenceOption => {
    const count = openTickets.get(option.id)
    return count == null
      ? option
      : { ...option, name: `${option.name} — ${t('detail.assign.openTickets', { count })}` }
  }

  const loadPrimary = async (q: string) => (await staffUserOptions(q)).map(withTicketCount)
  // Người đã là xử lý chính thì bỏ khỏi danh sách phụ: chọn trùng sẽ không lưu được,
  // chặn từ lúc chọn tốt hơn là báo lỗi sau khi bấm lưu.
  const loadAssistants = async (q: string) =>
    (await staffUserOptions(q)).filter((o) => o.id !== primaryUserId).map(withTicketCount)

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.assign.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.assignRepair(id, {
            primaryUserId: values.primaryUserId,
            assistantIds: values.assistantIds,
            dueAt: values.dueAt || undefined,
          })
          toast.success(t('detail.assign.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="primaryUserId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.assign.primary')}
              required
              queryKey="staff-users"
              loadOptions={loadPrimary}
              value={field.value || null}
              onChange={(v) => {
                const next = typeof v === 'string' ? v : ''
                field.onChange(next)
                // Đổi người chính mà người đó đang nằm trong danh sách phụ thì bỏ ra.
                form.setValue(
                  'assistantIds',
                  form.getValues('assistantIds').filter((assistantId) => assistantId !== next),
                )
              }}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="assistantIds"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.assign.assistant')}
              queryKey={`staff-assist-${primaryUserId || 'none'}`}
              loadOptions={loadAssistants}
              multiple
              value={field.value}
              onChange={(v) => field.onChange(Array.isArray(v) ? v : [])}
              clearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <DatetimeField control={form.control} name="dueAt" label={t('detail.assign.dueAt')} />
    </FormDialog>
  )
}
