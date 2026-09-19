import { z } from 'zod'

export const sysLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})
export type SysLoginValues = z.infer<typeof sysLoginSchema>
