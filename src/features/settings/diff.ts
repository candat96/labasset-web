import type { Settings } from './types'
import type { SettingsForm } from './schema'
import { AUTO_CODE_NUMBER_TYPES, NUMBER_DEFAULTS, NUMBER_TYPES } from './types'

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function values(settings: Settings): SettingsForm {
  const sla = settings['repair.sla'] as Record<string, unknown> | undefined
  const areaWeights = settings['kpi.areaWeights'] as Record<string, unknown> | undefined
  const metricWeights = settings['kpi.metricWeights'] as
    Record<string, Record<string, unknown>> | undefined
  const repairWeights = metricWeights?.repair
  const maintenanceWeights = metricWeights?.maintenance
  const calibrationWeights = metricWeights?.calibration
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
    kpi: {
      areaWeights: {
        repair: asNumber(areaWeights?.repair, 50),
        maintenance: asNumber(areaWeights?.maintenance, 30),
        calibration: asNumber(areaWeights?.calibration, 20),
      },
      metricWeights: {
        repair: {
          volume: asNumber(repairWeights?.volume, 30),
          onTime: asNumber(repairWeights?.onTime, 30),
          speed: asNumber(repairWeights?.speed, 20),
          quality: asNumber(repairWeights?.quality, 20),
        },
        maintenance: {
          volume: asNumber(maintenanceWeights?.volume, 30),
          onTime: asNumber(maintenanceWeights?.onTime, 30),
          speed: asNumber(maintenanceWeights?.speed, 20),
          quality: asNumber(maintenanceWeights?.quality, 20),
        },
        calibration: {
          volume: asNumber(calibrationWeights?.volume, 40),
          onTime: asNumber(calibrationWeights?.onTime, 40),
          quality: asNumber(calibrationWeights?.quality, 20),
        },
      },
      assistantWeight: asNumber(settings['kpi.assistantWeight'], 0.5),
      countBy: settings['kpi.countBy'] === 'closed' ? 'closed' : 'completed',
      minItems: asNumber(settings['kpi.minItems'], 3),
      staffCanSeeRanking: settings['kpi.staffCanSeeRanking'] !== false,
    },
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
  const areaChanged = (['repair', 'maintenance', 'calibration'] as const).some(
    (area) => after.kpi.areaWeights[area] !== before.kpi.areaWeights[area],
  )
  if (areaChanged) body['kpi.areaWeights'] = { ...after.kpi.areaWeights }
  const metricChanged =
    JSON.stringify(after.kpi.metricWeights) !== JSON.stringify(before.kpi.metricWeights)
  if (metricChanged) body['kpi.metricWeights'] = structuredClone(after.kpi.metricWeights)
  put('kpi.assistantWeight', after.kpi.assistantWeight, before.kpi.assistantWeight)
  put('kpi.countBy', after.kpi.countBy, before.kpi.countBy)
  put('kpi.minItems', after.kpi.minItems, before.kpi.minItems)
  put('kpi.staffCanSeeRanking', after.kpi.staffCanSeeRanking, before.kpi.staffCanSeeRanking)
  const allTypes: readonly string[] = [...NUMBER_TYPES, ...AUTO_CODE_NUMBER_TYPES]
  for (const type of allTypes) {
    const saved =
      typeof original[`numbering.${type}`] === 'string'
        ? String(original[`numbering.${type}`])
        : NUMBER_DEFAULTS[type as keyof typeof NUMBER_DEFAULTS]
    if (templates[type] !== saved) body[`numbering.${type}`] = templates[type]
  }
  return body
}

export function settingField(key: string): string | undefined {
  if (key === 'repair.sla') return 'repair.sla.low'
  if (key === 'kpi.areaWeights') return 'kpi.areaWeights.repair'
  if (key === 'kpi.metricWeights') return 'kpi.metricWeights.repair.volume'
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
    'kpi.assistantWeight',
    'kpi.countBy',
    'kpi.minItems',
    'kpi.staffCanSeeRanking',
  ])
  if (key.startsWith('numbering.')) return key
  return allowed.has(key) ? key : undefined
}
