import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export function listCalibrations(params: Record<string, unknown>) {
  return unwrap(
    api.GET('/v1/calibrations', { params: { query: pageQuery(params as never) as never } }),
  )
}
export function getCalibration(id: string) {
  return unwrap(api.GET('/v1/calibrations/{id}', { params: { path: { id } } }))
}
export function createCalibration(body: components['schemas']['CreateCalibrationDto']) {
  return unwrap(api.POST('/v1/calibrations', { body }))
}
export function completeCalibration(
  id: string,
  body: components['schemas']['CompleteCalibrationDto'],
) {
  return unwrap(api.POST('/v1/calibrations/{id}/complete', { params: { path: { id } }, body }))
}
export function cancelCalibration(id: string) {
  return unwrap(api.POST('/v1/calibrations/{id}/cancel', { params: { path: { id } } }))
}
export function calibrationHistory(equipmentId: string) {
  return unwrap(
    api.GET('/v1/calibrations/equipment/{equipmentId}/history', {
      params: { path: { equipmentId } },
    }),
  )
}
