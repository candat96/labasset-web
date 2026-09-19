import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { Component as IssuesPage } from './IssuesPage'
import { createTransfer } from '../api'

export function Component() {
  const canWrite = useCan(STAFF)
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: { fromWarehouseId: '', toWarehouseId: '', lotId: '', quantity: '1' },
  })
  return (
    <>
      <PageHeader
        title="Chuyển kho"
        actions={canWrite && <Button onClick={() => setOpen(true)}>Tạo chuyển kho</Button>}
      />
      <p className="text-muted-foreground mb-3 text-sm">Danh sách phiếu xuất loại chuyển kho.</p>
      <IssuesPage />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Tạo chuyển kho"
        form={form}
        onSubmit={async (values) => {
          try {
            await createTransfer({
              fromWarehouseId: values.fromWarehouseId,
              toWarehouseId: values.toWarehouseId,
              items: [{ lotId: values.lotId, quantity: values.quantity }],
            })
            toast.success('Đã tạo chuyển kho')
            setOpen(false)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={form.control}
          name="fromWarehouseId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Kho nguồn"
                queryKey="warehouses-from"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="toWarehouseId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Kho đích"
                queryKey="warehouses-to"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <QtyField control={form.control} name="quantity" label="Số lượng" />
      </FormDialog>
    </>
  )
}
