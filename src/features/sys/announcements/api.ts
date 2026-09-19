import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export type SysAnnouncement = components['schemas']['AnnouncementResponseDto']
export type SysAnnouncementPage = components['schemas']['AnnouncementPageDto']

export function listSysAnnouncements(page = 1, limit = 20) {
  return unwrap(api.GET('/sys/announcements', { params: { query: pageQuery({ page, limit }) } }))
}

export function createSysAnnouncement(body: components['schemas']['CreateAnnouncementDto']) {
  return unwrap(api.POST('/sys/announcements', { body }))
}

export function updateSysAnnouncement(
  id: string,
  body: components['schemas']['UpdateAnnouncementDto'],
) {
  return unwrap(api.PATCH('/sys/announcements/{id}', { params: { path: { id } }, body }))
}

export function deleteSysAnnouncement(id: string) {
  return unwrap(api.DELETE('/sys/announcements/{id}', { params: { path: { id } } }))
}
