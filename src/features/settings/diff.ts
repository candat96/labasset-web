import type { Settings } from './types'
import type { SettingsForm } from './schema'
import { NUMBER_DEFAULTS, NUMBER_TYPES } from './types'

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function values(settings: Settings): SettingsForm {
  const sla = settings['repair.sla'] as Record<string, unknown> | undefined
  return {
    hospital: {
      name: String(settings['hospital.name'] ?? ''),
      address: String(settings['hospital.address'] ?? ''),
      logoFileId:
        typeof settings['hospital.logoFileId'] === 'string'
          ? settings['hospital.logoFileId']
          : null,
    },
    approval: { levels: settings['approval.levels'] === 2 ? 2 : 1 },
    repair: {
      requireAcceptance: Boolean(settings['repair.requireAcceptance']),
      sla: {
        low: asNumber(sla?.low, 168),
        medium: asNumber(sla?.medium, 72),
        high: asNumber(sla?.high, 24),
        critical: asNumber(sla?.critical, 4),
      },
    },
    requests: { restrictToCompatible: Boolean(settings['requests.restrictToCompatible']) },
    stock: {
      defaultWarehouseId:
        typeof settings['stock.defaultWarehouseId'] === 'string'
          ? settings['stock.defaultWarehouseId']
          : null,
      cancelWindowDays: asNumber(settings['stock.cancelWindowDays'], 30),
    },
    alerts: {
      stockMinEnabled: Boolean(settings['alerts.stockMinEnabled']),
      expiryDaysBefore: asNumber(settings['alerts.expiryDaysBefore'], 30),
      maintenanceDaysBefore: asNumber(settings['alerts.maintenanceDaysBefore'], 14),
      calibrationDaysBefore: asNumber(settings['alerts.calibrationDaysBefore'], 30),
      repairCostPctOfValue: asNumber(settings['alerts.repairCostPctOfValue'], 50),
    },
    maintenance: { dueGraceDays: asNumber(settings['maintenance.dueGraceDays'], 7) },
  }
}

export function changedSettings(
  before: SettingsForm,
  after: SettingsForm,
  templates: Record<string, string>,
  original: Settings,
): Settings {
  const body: Settings = {}
  const put = (key: string, value: unknown, previous: unknown) => {
    if (value !== previous) body[key] = value
  }
  put('hospital.name', after.hospital.name, before.hospital.name)
  put('hospital.address', after.hospital.address, before.hospital.address)
  put('hospital.logoFileId', after.hospital.logoFileId, before.hospital.logoFileId)
  put('approval.levels', after.approval.levels, before.approval.levels)
  put('repair.requireAcceptance', after.repair.requireAcceptance, before.repair.requireAcceptance)
  put(
    'requests.restrictToCompatible',
    after.requests.restrictToCompatible,
    before.requests.restrictToCompatible,
  )
  const slaChanged = (['low', 'medium', 'high', 'critical'] as const).some(
    (level) => after.repair.sla[level] !== before.repair.sla[level],
  )
  if (slaChanged) body['repair.sla'] = { ...after.repair.sla }
  put('stock.defaultWarehouseId', after.stock.defaultWarehouseId, before.stock.defaultWarehouseId)
  put('stock.cancelWindowDays', after.stock.cancelWindowDays, before.stock.cancelWindowDays)
  put('alerts.stockMinEnabled', after.alerts.stockMinEnabled, before.alerts.stockMinEnabled)
  put('alerts.expiryDaysBefore', after.alerts.expiryDaysBefore, before.alerts.expiryDaysBefore)
  put(
    'alerts.maintenanceDaysBefore',
    after.alerts.maintenanceDaysBefore,
    before.alerts.maintenanceDaysBefore,
  )
  put(
    'alerts.calibrationDaysBefore',
    after.alerts.calibrationDaysBefore,
    before.alerts.calibrationDaysBefore,
  )
  put(
    'alerts.repairCostPctOfValue',
    after.alerts.repairCostPctOfValue,
    before.alerts.repairCostPctOfValue,
  )
  put('maintenance.dueGraceDays', after.maintenance.dueGraceDays, before.maintenance.dueGraceDays)
  for (const type of NUMBER_TYPES) {
    const saved =
      typeof original[`numbering.${type}`] === 'string'
        ? String(original[`numbering.${type}`])
        : NUMBER_DEFAULTS[type]
    if (templates[type] !== saved) body[`numbering.${type}`] = templates[type]
  }
  return body
}

export function settingField(key: string): string | undefined {
  if (key === 'repair.sla') return 'repair.sla.low'
  const allowed = new Set([
    'hospital.name',
    'hospital.address',
    'hospital.logoFileId',
    'approval.levels',
    'repair.requireAcceptance',
    'requests.restrictToCompatible',
    'stock.defaultWarehouseId',
    'stock.cancelWindowDays',
    'alerts.stockMinEnabled',
    'alerts.expiryDaysBefore',
    'alerts.maintenanceDaysBefore',
    'alerts.calibrationDaysBefore',
    'alerts.repairCostPctOfValue',
    'maintenance.dueGraceDays',
  ])
  return allowed.has(key) ? key : undefined
}
