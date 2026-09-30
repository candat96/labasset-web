import { describe, expect, it } from 'vitest'
import {
  collectReferenceIndex,
  neededReferenceKinds,
  referenceKindForField,
} from './audit-references'

describe('collectReferenceIndex', () => {
  it('gom object quan hệ lồng nhau thành bảng tra id → nhãn', () => {
    const index = collectReferenceIndex([
      {
        faultInfo: { id: 'f1', title: 'Lỗi bơm' },
        equipment: { id: 'e1', code: 'EQ-01', name: 'Máy ly tâm' },
      },
      [{ assignee: { id: 'u1', fullName: 'Lê Hoàng Cường' } }],
    ])
    expect(index.get('f1')).toBe('Lỗi bơm')
    expect(index.get('e1')).toBe('Máy ly tâm')
    expect(index.get('u1')).toBe('Lê Hoàng Cường')
  })

  it('bỏ qua object không có id hoặc không có nhãn', () => {
    const index = collectReferenceIndex([{ room: { code: 'P1', name: 'Phòng 1' }, x: { id: 'z' } }])
    expect(index.size).toBe(0)
  })
})

describe('referenceKindForField', () => {
  it('ánh xạ trường tham chiếu sang danh mục', () => {
    expect(referenceKindForField('repair_ticket', 'faultGroupId')).toBe('fault_group')
    expect(referenceKindForField('equipment', 'supplierId')).toBe('supplier')
    expect(referenceKindForField('equipment', 'departmentId')).toBe('department')
    expect(referenceKindForField('stock_receipt', 'toWarehouseId')).toBe('warehouse')
    expect(referenceKindForField('calibration', 'agencyId')).toBe('calibration_agency')
  })

  it('groupId phụ thuộc thực thể (nhóm máy vs nhóm vật tư)', () => {
    expect(referenceKindForField('equipment', 'groupId')).toBe('equipment_group')
    expect(referenceKindForField('supply', 'groupId')).toBe('supply_group')
  })

  it('trả null cho trường không phải tham chiếu', () => {
    expect(referenceKindForField('equipment', 'name')).toBeNull()
  })
})

describe('neededReferenceKinds', () => {
  it('chỉ đòi danh mục khi thực sự có UUID', () => {
    const kinds = neededReferenceKinds(
      [
        {
          before: { departmentId: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'A' },
          after: { departmentId: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'B' },
        },
      ],
      'equipment',
    )
    expect(kinds).toContain('department')
  })

  it('bỏ qua khi giá trị không phải UUID', () => {
    expect(
      neededReferenceKinds([{ before: { departmentId: null }, after: {} }], 'equipment'),
    ).toEqual([])
  })
})
