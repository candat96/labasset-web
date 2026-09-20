import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  AsyncSelect,
  type AsyncSelectProps,
  type ReferenceOption,
} from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'

/** `AsyncSelect` bọc trong `FormField` (react-hook-form) + hiện lỗi cạnh ô. */
export function AsyncSelectField<T extends FieldValues>({
  control,
  name,
  label,
  queryKey,
  loadOptions,
  selectedOptions,
  resolveOption,
  clearable,
  disabled,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  queryKey: string
  loadOptions: AsyncSelectProps['loadOptions']
  selectedOptions?: ReferenceOption[]
  resolveOption?: AsyncSelectProps['resolveOption']
  clearable?: boolean
  disabled?: boolean
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <AsyncSelect
            label={label}
            queryKey={queryKey}
            loadOptions={loadOptions}
            value={(field.value as string | null | undefined) ?? null}
            onChange={field.onChange}
            selectedOptions={selectedOptions}
            resolveOption={resolveOption}
            clearable={clearable}
            disabled={disabled}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
