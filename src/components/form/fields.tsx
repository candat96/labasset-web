import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
  disabled?: boolean
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  type = 'text',
  placeholder,
  autoComplete,
  autoFocus,
  inputMode,
  transform,
}: BaseProps<T> & {
  type?: string
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  /** Biến đổi giá trị khi gõ (vd. viết hoa mã). */
  transform?: (v: string) => string
}) {
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
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(transform ? transform(e.target.value) : e.target.value)
              }
              type={type}
              placeholder={placeholder ?? description}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              inputMode={inputMode}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  min,
  step,
  placeholder,
}: BaseProps<T> & { min?: number; step?: number; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              step={step}
              placeholder={placeholder ?? description}
              disabled={disabled}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  options,
  placeholder,
  /** Giá trị đại diện cho "không chọn" (Radix Select không nhận chuỗi rỗng). */
  emptyValue = '__none__',
  emptyLabel,
}: BaseProps<T> & {
  options: SelectOption[]
  placeholder?: string
  emptyValue?: string
  emptyLabel?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            disabled={disabled}
            value={
              field.value == null || field.value === ''
                ? emptyLabel
                  ? emptyValue
                  : ''
                : String(field.value)
            }
            onValueChange={(v) => field.onChange(v === emptyValue ? null : v)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder ?? description} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {emptyLabel && <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}
