import { StatusBadge as BaseBadge, type StatusTone } from '@/components/page/StatusBadge'
export type StatusMap = Record<string, { label: string; tone: StatusTone }>
export function StatusBadge({ value, map }: { value: string; map: StatusMap }) {
  const entry = map[value] ?? { label: value, tone: 'muted' as const }
  return <BaseBadge status={entry.tone} label={entry.label} />
}
