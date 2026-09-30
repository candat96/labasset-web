import { useQueries } from '@tanstack/react-query'
import { isRecord } from '@/lib/audit-entity'
import { isUuid } from '@/lib/audit-fields'
import {
  allDepartments,
  catalogOptions,
  storageLocationOptions,
  type Reference,
} from '@/api/references'

/**
 * Loại danh mục tham chiếu có endpoint tải hàng loạt (một lượt cho cả trang,
 * không gọi theo từng dòng nhật ký). Người dùng xử lý riêng vì `/v1/users` chỉ
 * mở cho quản trị viện.
 */
export type AuditRefKind =
  | 'department'
  | 'warehouse'
  | 'supplier'
  | 'manufacturer'
  | 'equipment_group'
  | 'fault_group'
  | 'component_type'
  | 'unit'
  | 'supply_group'
  | 'calibration_agency'
  | 'storage_location'

/** Trường (đã bỏ hậu tố `Id`) → loại danh mục. */
const REF_KIND_BY_FIELD: Record<string, AuditRefKind> = {
  department: 'department',
  reportedDepartment: 'department',
  fromDepartment: 'department',
  toDepartment: 'department',
  warehouse: 'warehouse',
  toWarehouse: 'warehouse',
  fromWarehouse: 'warehouse',
  supplier: 'supplier',
  defaultSupplier: 'supplier',
  manufacturer: 'manufacturer',
  faultGroup: 'fault_group',
  componentType: 'component_type',
  unit: 'unit',
  purchaseUnit: 'unit',
  agency: 'calibration_agency',
  location: 'storage_location',
}

/**
 * Chiều tham chiếu của trường `groupId`: máy dùng nhóm thiết bị, vật tư dùng nhóm
 * vật tư — cùng tên trường, khác danh mục.
 */
function groupKind(entityType: string): AuditRefKind | null {
  if (entityType === 'equipment' || entityType === 'equipment_transfer') return 'equipment_group'
  if (entityType === 'supply') return 'supply_group'
  return null
}

/** Loại danh mục cần tra cho một trường của một thực thể (null nếu không phải tham chiếu). */
export function referenceKindForField(entityType: string, key: string): AuditRefKind | null {
  const base = key.replace(/Ids?$/, '')
  if (base === 'group') return groupKind(entityType)
  return REF_KIND_BY_FIELD[base] ?? null
}

const LABEL_KEYS = ['name', 'fullName', 'title', 'code', 'username'] as const

/**
 * Quét `before`/`after` của mọi dòng, gom mọi object quan hệ dạng
 * `{id, name|fullName|title|code|username}` thành bảng tra id → nhãn. Nhờ đó các
 * giá trị UUID mà bản thân bản ghi đã kèm quan hệ (thiết bị, người xử lý,
 * thư viện lỗi…) được hiện tên mà không cần gọi thêm API.
 */
export function collectReferenceIndex(values: unknown[]): Map<string, string> {
  const index = new Map<string, string>()
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!isRecord(value)) return
    const id = value.id
    if (typeof id === 'string') {
      const label = LABEL_KEYS.map((k) => value[k]).find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      )
      if (label) index.set(id, label)
    }
    Object.values(value).forEach(visit)
  }
  values.forEach(visit)
  return index
}

/** Các loại danh mục cần gọi API cho tập bản ghi (chỉ gọi khi thực sự có UUID). */
export function neededReferenceKinds(
  items: { before: unknown; after: unknown }[],
  entityType: string,
): AuditRefKind[] {
  const needed = new Set<AuditRefKind>()
  const consider = (key: string, value: unknown) => {
    const kind = referenceKindForField(entityType, key)
    if (!kind) return
    if (isUuid(value) || (Array.isArray(value) && value.some(isUuid))) needed.add(kind)
  }
  for (const item of items)
    for (const side of [item.before, item.after])
      if (isRecord(side)) for (const [key, value] of Object.entries(side)) consider(key, value)
  return [...needed].sort()
}

async function loadReferenceKind(kind: AuditRefKind): Promise<Reference[]> {
  switch (kind) {
    case 'department':
      return allDepartments()
    case 'warehouse':
      return catalogOptions('warehouses', '')
    case 'supplier':
      return catalogOptions('suppliers', '')
    case 'manufacturer':
      return catalogOptions('manufacturers', '')
    case 'equipment_group':
      return catalogOptions('equipment-groups', '')
    case 'fault_group':
      return catalogOptions('fault-groups', '')
    case 'component_type':
      return catalogOptions('component-types', '')
    case 'unit':
      return catalogOptions('units', '')
    case 'supply_group':
      return catalogOptions('supply-groups', '')
    case 'calibration_agency':
      return catalogOptions('calibration-agencies', '')
    case 'storage_location':
      return storageLocationOptions(null, '')
  }
}

/**
 * Bảng tra UUID tham chiếu cho nhật ký: mỗi loại danh mục gọi API đúng một lần
 * (cache 5 phút, chung cho mọi dòng và mọi màn chi tiết).
 */
export function useAuditReferenceLookup(
  items: { before: unknown; after: unknown }[] | undefined,
  entityType: string,
): Map<string, string> {
  const kinds = neededReferenceKinds(items ?? [], entityType)
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: ['audit-reference', kind] as const,
      queryFn: () => loadReferenceKind(kind),
      staleTime: 300_000,
    })),
  })
  const map = new Map<string, string>()
  for (const query of queries) for (const row of query.data ?? []) map.set(row.id, row.name)
  return map
}
