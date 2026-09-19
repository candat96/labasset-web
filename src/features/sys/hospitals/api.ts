import { api, unwrap, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export type Hospital = components['schemas']['HospitalListItemDto']
export type HospitalDetail = components['schemas']['HospitalDetailDto']
export type HospitalPage = components['schemas']['HospitalPageDto']
export type HospitalUsage = components['schemas']['UsageResponseDto']
export type ProvisionAccepted = components['schemas']['ProvisionAcceptedDto']
export type AdminReset = components['schemas']['AdminResetResponseDto']
export type MigrationStatus = components['schemas']['MigrationStatusDto']
export type MigrationResult = components['schemas']['MigrationResultDto']

export interface HospitalListParams {
  page?: number
  limit?: number
  q?: string
  status?: Hospital['status']
}

export function listHospitals(params: HospitalListParams) {
  return unwrap(api.GET('/sys/hospitals', { params: { query: pageQuery(params) } }))
}

export function getHospital(id: string) {
  return unwrap(api.GET('/sys/hospitals/{id}', { params: { path: { id } } }))
}

export function createHospital(body: components['schemas']['CreateHospitalDto']) {
  return unwrap(api.POST('/sys/hospitals', { body }))
}

export function updateHospital(id: string, body: components['schemas']['UpdateHospitalDto']) {
  return unwrap(api.PATCH('/sys/hospitals/{id}', { params: { path: { id } }, body }))
}

export function hospitalAction(
  id: string,
  action: 'suspend' | 'resume' | 'provision/retry' | 'migrate',
) {
  return unwrapAs<ProvisionAccepted | MigrationResult | undefined>(
    api.POST(`/sys/hospitals/{id}/${action}`, { params: { path: { id } } }),
  )
}

export function resetHospitalAdmin(id: string) {
  return unwrap(api.POST('/sys/hospitals/{id}/reset-admin', { params: { path: { id } } }))
}

export function hospitalUsage(id: string, from?: string, to?: string) {
  return unwrap(
    api.GET('/sys/hospitals/{id}/usage', { params: { path: { id }, query: { from, to } } }),
  )
}

export function migrationsStatus() {
  return unwrap(api.GET('/sys/migrations/status'))
}

export function runAllMigrations() {
  return unwrap(api.POST('/sys/migrations/run-all'))
}
