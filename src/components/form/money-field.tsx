import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { TextField } from './fields'
export interface DecimalFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  disabled?: boolean
  /** Dấu sao đỏ + nhãn đọc màn hình; kế thừa từ TextField. */
  required?: boolean
  placeholder?: string
}
export function MoneyField<T extends FieldValues>(props: DecimalFieldProps<T>) {
  return (
    <TextField
      {...props}
      inputMode="decimal"
      description="Đơn vị: đồng. Nhập chuỗi số, không có dấu phân nhóm."
    />
  )
}
