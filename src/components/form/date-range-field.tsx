import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { DateRangePicker } from '@/components/date-picker'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export function DateRangeField<T extends FieldValues>({
  control,
  fromName,
  toName,
  label,
}: {
  control: Control<T>
  fromName: FieldPath<T>
  toName: FieldPath<T>
  label: string
}) {
  return (
    <FormField
      control={control}
      name={fromName}
      render={({ field: fromField }) => (
        <FormField
          control={control}
          name={toName}
          render={({ field: toField }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <DateRangePicker
                from={typeof fromField.value === 'string' ? fromField.value : undefined}
                to={typeof toField.value === 'string' ? toField.value : undefined}
                ariaLabel={label}
                onChange={(range) => {
                  fromField.onChange(range.from ?? '')
                  toField.onChange(range.to ?? '')
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    />
  )
}
