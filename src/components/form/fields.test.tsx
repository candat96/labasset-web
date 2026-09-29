import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { TextField, SelectField } from './fields'

type Values = { name: string; group: string }

function Harness() {
  const form = useForm<Values>({ defaultValues: { name: '', group: '' } })
  return (
    <Form {...form}>
      <form>
        <TextField control={form.control} name="name" label="Tên vật tư" required />
        <SelectField
          control={form.control}
          name="group"
          label="Nhóm"
          options={[{ value: 'a', label: 'Nhóm A' }]}
        />
      </form>
    </Form>
  )
}

it('trường bắt buộc có dấu sao và người dùng đọc màn hình nghe được "bắt buộc"', () => {
  render(<Harness />)

  const required = screen.getByText('Tên vật tư').closest('label')
  expect(required).toHaveTextContent('*')
  // Dấu sao một mình chỉ người nhìn thấy mới nhận ra, nên phải có chữ kèm theo.
  expect(required).toHaveTextContent('(bắt buộc)')

  const optional = screen.getByText('Nhóm').closest('label')
  expect(optional).not.toHaveTextContent('*')
  expect(optional).not.toHaveTextContent('(bắt buộc)')
})
