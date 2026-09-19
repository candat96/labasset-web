const targets: [string, string][] = [
  ['requestId', '/requests'],
  ['repairTicketId', '/repairs'],
  ['equipmentId', '/equipment'],
  ['taskId', '/maintenance/tasks'],
  ['calibrationId', '/calibrations'],
  ['issueId', '/stock/issues'],
  ['receiptId', '/stock/receipts'],
]
export function notificationLink(data: Record<string, string> | null | undefined): string | null {
  if (!data) return null
  for (const [key, path] of targets)
    if (data[key]) return `${path}/${encodeURIComponent(data[key])}`
  if (data.alertId) return '/stock/alerts'
  return data.path?.startsWith('/') && !data.path.startsWith('//') && !data.path.includes('\\')
    ? data.path
    : null
}
