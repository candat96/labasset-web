import type { FieldValues } from 'react-hook-form'
import { TextField } from './fields'
import type { DecimalFieldProps } from './money-field'
export function QtyField<T extends FieldValues>(props: DecimalFieldProps<T>) {
  return (
    <TextField
      {...props}
      inputMode="decimal"
      description="Tối đa 3 chữ số thập phân, dùng dấu chấm."
    />
  )
}
