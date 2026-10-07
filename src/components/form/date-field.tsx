import type { FieldPath, FieldValues, Control } from 'react-hook-form'
import { DatePicker } from '@/components/date-picker'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  required,
  placeholder,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  disabled?: boolean
  /** Dấu sao đỏ ở nhãn; ràng buộc vẫn do zod quyết định. */
  required?: boolean
  placeholder?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <DatePicker
              value={typeof field.value === 'string' ? field.value : undefined}
              onChange={field.onChange}
              disabled={disabled}
              placeholder={placeholder}
              ariaLabel={label}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
