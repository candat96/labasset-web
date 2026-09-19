import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

type DateInput = string | Date | null | undefined

function parse(v: string | Date): Date {
  return typeof v === 'string' ? parseISO(v) : v
}

function safe(v: DateInput, fn: (d: Date) => string): string {
  if (!v) return ''
  const d = parse(v)
  return isValid(d) ? fn(d) : ''
}

export const formatDate = (v: DateInput) => safe(v, (d) => format(d, 'dd/MM/yyyy'))
export const formatDateTime = (v: DateInput) => safe(v, (d) => format(d, 'HH:mm dd/MM/yyyy'))
export const formatRelative = (v: DateInput) =>
  safe(v, (d) => formatDistanceToNowStrict(d, { addSuffix: true, locale: vi }))
