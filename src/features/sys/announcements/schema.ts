import { z } from 'zod'

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Bắt buộc').max(255),
  body: z.string().trim().min(1, 'Bắt buộc').max(10000),
  level: z.enum(['info', 'warning']),
  startsAt: z.string().min(1, 'Bắt buộc'),
  endsAt: z.string(),
})
export type AnnouncementValues = z.infer<typeof announcementSchema>
