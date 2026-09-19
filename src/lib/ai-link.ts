/** Đường vào trợ lý với ngữ cảnh máy — không import feature assistant. */
export function assistantPath(opts?: { equipmentId?: string; repairId?: string }) {
  const params = new URLSearchParams()
  if (opts?.equipmentId) params.set('equipmentId', opts.equipmentId)
  if (opts?.repairId) params.set('repairId', opts.repairId)
  const query = params.toString()
  return query ? `/assistant?${query}` : '/assistant'
}
