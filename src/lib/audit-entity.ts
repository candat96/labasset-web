const catalogPaths: Record<string, string> = {
  supplier: 'suppliers',
  manufacturer: 'manufacturers',
  equipment_group: 'equipment-groups',
  supply_group: 'supply-groups',
  unit: 'units',
  warehouse: 'warehouses',
  funding_source: 'funding-sources',
  connection_type: 'connection-types',
  component_type: 'component-types',
  calibration_agency: 'calibration-agencies',
  fault_group: 'fault-groups',
}

const paths: Record<string, (id: string) => string> = {
  users: (id) => `/admin/users/${id}`,
  departments: (id) => `/admin/departments/${id}`,
  ...Object.fromEntries(
    Object.entries(catalogPaths).map(([entity, slug]) => [
      entity,
      (id: string) => `/admin/catalogs/${slug}?highlight=${id}`,
    ]),
  ),
  equipment: (id) => `/equipment/${id}`,
  supply: (id) => `/supplies/${id}`,
  repair_ticket: (id) => `/repairs/${id}`,
  request: (id) => `/requests/${id}`,
  stock_receipt: (id) => `/stock/receipts/${id}`,
  stock_issue: (id) => `/stock/issues/${id}`,
  stock_transfer: (id) => `/stock/transfers/${id}`,
  calibration: (id) => `/calibrations/${id}`,
  maintenance_task: (id) => `/maintenance/tasks/${id}`,
  maintenance_plan: (id) => `/maintenance/plans/${id}`,
  stocktake_session: (id) => `/stocktakes/${id}`,
  fault: (id) => `/faults/${id}`,
  stock_alert: () => `/stock/alerts`,
  settings: () => `/admin/settings`,
}

export function auditEntityPath(entityType: string, entityId: string | null): string | null {
  const to = paths[entityType]
  if (!to) return null
  if (entityType === 'settings' || entityType === 'stock_alert') return to('')
  return entityId ? to(entityId) : null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function changedKeys(before: unknown, after: unknown): Set<string> {
  const left = isRecord(before) ? before : {}
  const right = isRecord(after) ? after : {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  const changed = new Set<string>()
  for (const key of keys)
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) changed.add(key)
  return changed
}

export function matchesAuditQuery(
  item: {
    action: string
    entityType: string
    entityId: string | null
    userId: string | null
    ip: string | null
    before: unknown
    after: unknown
  },
  action?: string,
  q?: string,
) {
  if (action && item.action !== action) return false
  if (!q) return true
  const needle = q.toLowerCase()
  const hay = [
    item.action,
    item.entityType,
    item.entityId ?? '',
    item.userId ?? '',
    item.ip ?? '',
    JSON.stringify(item.before ?? ''),
    JSON.stringify(item.after ?? ''),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}
