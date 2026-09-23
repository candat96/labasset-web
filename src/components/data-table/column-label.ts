import type { Column } from '@tanstack/react-table'

/**
 * Nhãn hiển thị của cột cho menu ẩn/hiện và aria-label sắp xếp:
 * `meta.label` → `header` dạng chuỗi → id (tránh lộ khoá kỹ thuật tiếng Anh).
 */
export function columnLabel<T>(column: Column<T, unknown>): string {
  const { meta, header } = column.columnDef
  if (meta?.label) return meta.label
  if (typeof header === 'string' && header.trim()) return header
  return column.id
}
