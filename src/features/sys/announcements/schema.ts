import { z } from 'zod'
import i18n from '@/lib/i18n'

export const announcementSchema = z.object({
  title: z.string().trim().min(1, i18n.t('sys:announcement.errors.required')).max(255),
  body: z.string().trim().min(1, i18n.t('sys:announcement.errors.required')).max(10000),
  level: z.enum(['info', 'warning']),
  startsAt: z.string().min(1, i18n.t('sys:announcement.errors.required')),
  endsAt: z.string(),
})
export type AnnouncementValues = z.infer<typeof announcementSchema>
