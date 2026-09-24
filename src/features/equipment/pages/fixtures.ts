import { HttpResponse } from 'msw'
import type { components } from '@/api/schema'

export type EquipmentDetail = components['schemas']['EquipmentDetailDto']
export type EquipmentListRow = components['schemas']['EquipmentListItemDto']
export type AccessoryRow = components['schemas']['AccessoryResponseDto']
export type SoftwareRow = components['schemas']['SoftwareResponseDto']
export type ComponentFixture = components['schemas']['ComponentResponseDto']
export type TransferRow = components['schemas']['TransferResponseDto']
export type CounterRow = components['schemas']['CounterResponseDto']

export const listRow: EquipmentListRow = {
  id: 'e1',
  code: 'TB-2026-00001',
  name: 'Máy huyết học',
  model: 'XN-1000',
  serial: 'SN1',
  departmentId: 'd1',
  departmentName: 'Huyết học',
  groupId: null,
  groupName: null,
  manufacturerName: 'Sysmex',
  location: 'P.101',
  roomId: 'r1',
  room: { id: 'r1', code: 'HH-P101', name: 'Phòng Huyết học', building: 'Nhà A', floor: 'Tầng 1' },
  staffInChargeUserId: 'u1',
  status: 'active',
  nextMaintenanceAt: null,
  nextCalibrationAt: '2026-09-01T00:00:00Z',
  calibrationOverdue: true,
  updatedAt: '2026-09-19T00:00:00Z',
}

export const detail: EquipmentDetail = {
  id: 'e1',
  code: 'TB-1',
  name: 'Máy A',
  assetCode: null,
  model: 'X',
  serial: 'S',
  manufacturerId: null,
  manufacturer: null,
  supplierId: null,
  supplier: null,
  countryOfOrigin: null,
  manufactureYear: null,
  receivedAt: null,
  commissionedAt: null,
  fundingSourceId: null,
  fundingSource: null,
  originalValue: '1000',
  warrantyUntil: '2027-01-01',
  purchaseContractNo: null,
  decisionNo: null,
  circulationNo: null,
  groupId: null,
  group: null,
  departmentId: 'd1',
  department: { id: 'd1', code: 'HH', name: 'Huyết học' },
  location: 'P1',
  roomId: 'r1',
  room: { id: 'r1', code: 'HH-P101', name: 'Phòng Huyết học', building: 'Nhà A', floor: 'Tầng 1' },
  deptContactUserId: null,
  deptContact: null,
  staffInChargeUserId: null,
  staffInCharge: null,
  status: 'active',
  statusNote: null,
  testTypes: [],
  throughputPerHour: null,
  specs: { voltage: '220V' },
  notes: null,
  qrToken: 'tok',
  photoFileId: null,
  currentRunHours: '90',
  currentTestCount: 0,
  nextMaintenanceAt: null,
  lastMaintenanceAt: null,
  nextCalibrationAt: null,
  lastCalibrationAt: null,
  calibrationOverdue: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  network: null,
  counts: { accessories: 1, components: 1, componentsDue: 0, openRepairs: 0 },
}

export const accessory: AccessoryRow = {
  id: 'a1',
  equipmentId: 'e1',
  code: 'PK-1',
  name: 'Cáp nguồn',
  type: 'power_cable',
  quantity: 1,
  condition: 'good',
  replacedAt: null,
  notes: null,
}

export const software: SoftwareRow = {
  id: 's1',
  equipmentId: 'e1',
  name: 'LabOS',
  version: '1.0',
  updatedOn: '2026-01-01T00:00:00Z',
  licenseExpiresAt: '2027-01-01T00:00:00Z',
  notes: null,
  hasLicenseKey: true,
  licenseKeyMasked: '****-1234',
}

export const componentRow: ComponentFixture = {
  id: 'c1',
  equipmentId: 'e1',
  name: 'Bơm',
  componentTypeId: null,
  partNo: 'P-1',
  serial: 'P1',
  installedAt: '2026-01-01T00:00:00Z',
  lifespanHours: 100,
  lifespanTests: null,
  lifespanMonths: null,
  usageHoursAtInstall: '0',
  usageTestsAtInstall: 0,
  status: 'warning',
  lastNotifiedStatus: null,
  notes: null,
}

export const transfer: TransferRow = {
  id: 't1',
  equipmentId: 'e1',
  fromDepartmentId: 'd1',
  toDepartmentId: 'd2',
  fromLocation: 'P1',
  toLocation: 'P2',
  toRoomId: null,
  reason: 'Chuyển khoa',
  requestedBy: 'u2',
  approvedBy: null,
  status: 'pending',
  transferredAt: null,
  minutesFileId: null,
  note: null,
  createdAt: '2026-09-19T00:00:00Z',
  attachments: [],
}

export const counter: CounterRow = {
  id: 'ct1',
  equipmentId: 'e1',
  recordedAt: '2026-09-19T00:00:00Z',
  runHours: '90',
  testCount: 120,
  source: 'manual',
  byUserId: 'u1',
  note: 'Đầu ngày',
}

/** Lỗi validate giống backend để test không "nuốt" body sai. */
export const validationError = (message: string) =>
  HttpResponse.json({ code: 'VALIDATION_ERROR', message }, { status: 400 })

export const page = <T>(items: T[], total = items.length, limit = 20) => ({
  items,
  total,
  page: 1,
  limit,
})
