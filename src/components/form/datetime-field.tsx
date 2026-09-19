import type { FieldValues } from 'react-hook-form'
import { format } from 'date-fns'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { DecimalFieldProps } from './money-field'
export function DatetimeField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: DecimalFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              disabled={disabled}
              type="datetime-local"
              value={
                field.value ? format(new Date(field.value as string), "yyyy-MM-dd'T'HH:mm") : ''
              }
              onChange={(e) =>
                field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
