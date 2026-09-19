import type { FieldValues } from 'react-hook-form'
import { TextField } from './fields'
import type { DecimalFieldProps } from './money-field'
export function DateField<T extends FieldValues>(props: DecimalFieldProps<T>) {
  return <TextField {...props} type="date" />
}
