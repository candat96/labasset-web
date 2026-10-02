import { describe, expect, it } from 'vitest'
import {
  slugifyItemKey,
  toChecklistItems,
  toEditableItems,
  uniqueItemKey,
  type EditableChecklistItem,
} from './checklist'

const base: EditableChecklistItem = {
  uid: 'u1',
  key: '',
  label: '',
  type: 'check',
  unit: '',
  min: '',
  max: '',
  optional: false,
  fresh: true,
}

describe('checklist helpers', () => {
  it('sinh mã từ nhãn tiếng Việt, bỏ dấu và ký tự lạ', () => {
    expect(slugifyItemKey('Nguồn điện')).toBe('nguon_dien')
    expect(slugifyItemKey('Đo nhiệt độ (C°)')).toBe('do_nhiet_do_c')
    expect(slugifyItemKey('  ***  ')).toBe('')
  })

  it('giới hạn mã 32 ký tự', () => {
    expect(slugifyItemKey('a'.repeat(40))).toHaveLength(32)
  })

  it('thêm hậu tố khi mã trùng', () => {
    const used = new Set(['nguon_dien', 'nguon_dien_2'])
    expect(uniqueItemKey('nguon_dien', used)).toBe('nguon_dien_3')
    expect(uniqueItemKey('', new Set())).toBe('item')
  })

  it('mục đã lưu giữ nguyên key', () => {
    const rows = toEditableItems([
      { key: 'power', label: 'Nguồn', type: 'check' },
      { key: 'temp', label: 'Nhiệt độ', type: 'measure', unit: '°C', min: 2, max: 8 },
    ])
    expect(rows[0]).toMatchObject({ key: 'power', fresh: false })
    expect(rows[1]).toMatchObject({ key: 'temp', unit: '°C', min: '2', max: '8' })
  })

  it('chỉ gửi unit/min/max khi là số đo', () => {
    const items = toChecklistItems([
      { ...base, key: 'a', label: 'Nguồn', unit: 'V', min: '1' },
      { ...base, key: 'b', label: 'Nhiệt độ', type: 'measure', unit: '°C', min: '2', max: '8' },
    ])
    expect(items![0]).toMatchObject({ unit: undefined, min: undefined, max: undefined })
    expect(items![1]).toMatchObject({ unit: '°C', min: 2, max: 8 })
  })

  it('trả null khi có dòng thiếu nhãn', () => {
    expect(toChecklistItems([{ ...base, key: 'a', label: '   ' }])).toBeNull()
  })
})
