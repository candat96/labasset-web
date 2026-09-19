import { z } from 'zod'
import './zod'

it('uses Vietnamese messages', () => {
  const s = z.object({ name: z.string().min(1), age: z.number().max(5) })
  const r = s.safeParse({ name: '', age: 9 })
  expect(r.success).toBe(false)
  const msgs = r.error?.issues.map((i) => i.message)
  expect(msgs).toContain('Bắt buộc')
  expect(msgs).toContain('Tối đa 5')
  expect(s.safeParse({}).error?.issues[0]?.message).toBe('Bắt buộc')
})
