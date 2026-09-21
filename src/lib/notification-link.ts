const targets: [string, string][] = [
  ['requestId', '/requests'],
  ['repairTicketId', '/repairs'],
  ['equipmentId', '/equipment'],
  ['taskId', '/maintenance/tasks'],
  ['calibrationId', '/calibrations'],
  ['issueId', '/stock/issues'],
  ['receiptId', '/stock/receipts'],
]
export function notificationLink(
  data: Record<string, string> | null | undefined,
  type?: string,
): string | null {
  if (!data) return null
  // Thông báo dự trù (demand.*) dùng requestId/periodId riêng → ưu tiên theo type
  // để không trộn với requestId của phiếu yêu cầu C2 (/requests).
  if (type?.startsWith('demand.')) {
    if (data.requestId) return `/procurement/demand/requests/${encodeURIComponent(data.requestId)}`
    if (data.periodId) return `/procurement/demand/periods/${encodeURIComponent(data.periodId)}`
  }
  for (const [key, path] of targets)
    if (data[key]) return `${path}/${encodeURIComponent(data[key])}`
  if (data.alertId) return '/stock/alerts'
  return data.path?.startsWith('/') && !data.path.startsWith('//') && !data.path.includes('\\')
    ? data.path
    : null
}
