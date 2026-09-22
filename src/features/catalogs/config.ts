import { ROOM_TYPES } from '@/lib/enum-labels'
import type { CatalogConfig, CatalogSlug } from './types'

/** Ví dụ mã tự sinh theo từng danh mục — dùng cho placeholder ô Mã (handoff 16). */
export const catalogCodeExamples: Record<CatalogSlug, string> = {
  suppliers: 'NCC-0001',
  manufacturers: 'NSX-0001',
  'equipment-groups': 'NTB-001',
  'supply-groups': 'NVT-001',
  units: 'DVT-001',
  warehouses: 'KHO-001',
  'funding-sources': 'NV-001',
  'connection-types': 'KN-001',
  'component-types': 'LK-001',
  'calibration-agencies': 'DVKD-001',
  'fault-groups': 'NL-001',
  rooms: 'PH-0001',
}

/**
 * Cấu hình trường của từng danh mục. Nhãn tiêu đề/trường lấy qua i18n:
 * `titles.<slug>` và `catalogFields.<slug>.<field>` trong namespace `catalogs`.
 */
export const catalogConfigs: Record<CatalogSlug, CatalogConfig> = {
  suppliers: {
    fields: [
      { name: 'contactName' },
      { name: 'contactPhone' },
      { name: 'phone' },
      { name: 'email', type: 'email' },
      { name: 'address' },
      { name: 'taxCode' },
      { name: 'maintenanceContractNo' },
      { name: 'maintenanceContractExpiresAt', type: 'date' },
      { name: 'rating', type: 'number', min: 1, max: 5 },
      { name: 'notes' },
    ],
  },
  manufacturers: {
    fields: [{ name: 'country' }, { name: 'website', type: 'url' }],
  },
  'equipment-groups': {
    fields: [
      { name: 'parentId', type: 'reference', reference: 'self' },
      { name: 'defaultMaintenanceCycleMonths', type: 'number', min: 0 },
      { name: 'defaultCalibrationCycleMonths', type: 'number', min: 0 },
    ],
  },
  'supply-groups': {
    fields: [
      { name: 'parentId', type: 'reference', reference: 'self' },
      { name: 'requiresLot', type: 'boolean' },
      { name: 'requiresExpiry', type: 'boolean' },
    ],
  },
  units: { fields: [{ name: 'symbol' }] },
  warehouses: {
    fields: [
      { name: 'departmentId', type: 'reference', reference: 'departments' },
      { name: 'address' },
      { name: 'keeperUserId', type: 'user' },
    ],
  },
  'funding-sources': { fields: [] },
  'connection-types': { fields: [] },
  'component-types': {
    fields: [
      { name: 'defaultLifespanHours', type: 'number', min: 0 },
      { name: 'defaultLifespanTests', type: 'number', min: 0 },
      { name: 'defaultLifespanMonths', type: 'number', min: 0 },
    ],
  },
  'calibration-agencies': {
    fields: [
      { name: 'address' },
      { name: 'phone' },
      { name: 'email', type: 'email' },
      { name: 'licenseNo' },
    ],
  },
  'fault-groups': {
    fields: [
      { name: 'severity', type: 'severity' },
      { name: 'requiresCalibrationAfterFix', type: 'boolean' },
    ],
  },
  rooms: {
    filterDepartment: true,
    fields: [
      {
        name: 'departmentId',
        type: 'reference',
        reference: 'departments',
        nullLabelKey: 'shared',
      },
      { name: 'building', listGroup: 'buildingFloor' },
      { name: 'floor', listGroup: 'buildingFloor' },
      { name: 'roomType', type: 'enum', options: ROOM_TYPES, enumKind: 'roomType' },
    ],
  },
}
