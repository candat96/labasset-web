import { catalogSchema } from './schema'
import { catalogCodeExamples, catalogConfigs } from './config'

const base = { name: 'Hãng A', isActive: true, sortOrder: 0 }

describe('catalogSchema — Mã không bắt buộc (handoff 16)', () => {
  const schema = catalogSchema(catalogConfigs.manufacturers)

  it('chấp nhận Mã để trống — server tự sinh', () => {
    expect(schema.safeParse({ ...base, code: '' }).success).toBe(true)
  })

  it('chấp nhận Mã đúng định dạng', () => {
    const parsed = schema.safeParse({ ...base, code: 'nsx-01' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.code).toBe('NSX-01')
  })

  it('từ chối Mã sai định dạng (khoảng trắng, thường)', () => {
    expect(schema.safeParse({ ...base, code: 'abc def' }).success).toBe(false)
    expect(schema.safeParse({ ...base, code: 'MÃ SAI!' }).success).toBe(false)
  })

  it('có ví dụ mã placeholder cho mọi danh mục', () => {
    for (const slug of Object.keys(catalogConfigs) as (keyof typeof catalogConfigs)[]) {
      expect(catalogCodeExamples[slug]).toMatch(/^[A-Z0-9-]+$/)
    }
  })
})
