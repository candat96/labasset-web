import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FormDrawer } from './FormDrawer'

type Values = { name: string }

function Harness({
  open = true,
  onOpenChange = vi.fn(),
  onSubmit = vi.fn(),
  secondaryAction,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit?: (v: Values) => void
  secondaryAction?: React.ReactNode
}) {
  const form = useForm<Values>({ defaultValues: { name: '' } })
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm thiết bị"
      form={form}
      onSubmit={onSubmit}
      secondaryAction={secondaryAction}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tên máy</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}

describe('FormDrawer (§UX quyết định 6)', () => {
  it('mở thì con trỏ nhảy vào trường đầu', async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.getByLabelText('Tên máy')).toHaveFocus())
  })

  it('submit gọi onSubmit với giá trị đã nhập', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Tên máy'), 'Máy siêu âm')
    await userEvent.click(screen.getByRole('button', { name: 'actions.save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Máy siêu âm' }))
  })

  it('chưa sửa gì thì bấm Huỷ đóng luôn, không hỏi', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'actions.cancel' }))
    expect(screen.queryByTestId('form-drawer-confirm')).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('nút phụ (ví dụ Lưu nháp) hiện ở thanh đáy và bấm được', async () => {
    const draft = vi.fn()
    render(
      <Harness
        secondaryAction={
          <button type="button" onClick={draft}>
            Lưu nháp
          </button>
        }
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    expect(draft).toHaveBeenCalled()
  })

  it('đang sửa dở thì hỏi trước khi đóng; xác nhận mới đóng thật', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    await userEvent.type(screen.getByLabelText('Tên máy'), 'dở')
    await userEvent.click(screen.getByRole('button', { name: 'actions.cancel' }))
    expect(await screen.findByTestId('form-drawer-confirm')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Đóng, bỏ thay đổi' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
