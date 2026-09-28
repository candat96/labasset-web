import { api, unwrap, unwrapAs } from '@/api/client'
import type { SupplierEvaluation, SupplierEvaluationFacts, SupplierEvaluationInput } from './types'

const listPath = '/v1/suppliers/{id}/evaluations' as const
const itemPath = '/v1/suppliers/{id}/evaluations/{evaluationId}' as const
const factsPath = '/v1/suppliers/{id}/evaluation-facts' as const

export function listSupplierEvaluations(id: string) {
  return unwrapAs<SupplierEvaluation[]>(api.GET(listPath, { params: { path: { id } } }))
}

export function createSupplierEvaluation(id: string, body: SupplierEvaluationInput) {
  return unwrapAs<SupplierEvaluation>(
    api.POST(listPath, { params: { path: { id } }, body: body as never }),
  )
}

export function updateSupplierEvaluation(
  id: string,
  evaluationId: string,
  body: Partial<SupplierEvaluationInput>,
) {
  return unwrapAs<SupplierEvaluation>(
    api.PATCH(itemPath, {
      params: { path: { id, evaluationId } },
      body: body as never,
    }),
  )
}

export async function deleteSupplierEvaluation(id: string, evaluationId: string): Promise<void> {
  const { response, error } = await api.DELETE(itemPath, {
    params: { path: { id, evaluationId } },
  })
  if (error !== undefined || !response.ok) await unwrap(Promise.resolve({ response, error }))
}

export function getSupplierEvaluationFacts(id: string, from?: string, to?: string) {
  return unwrapAs<SupplierEvaluationFacts>(
    api.GET(factsPath, { params: { path: { id }, query: { from, to } } }),
  )
}
