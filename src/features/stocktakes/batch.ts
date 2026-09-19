export type StocktakeCountLine = {
  clientId: string
  code: string
  countedQty: string
  countedStatus?: string
  countedLocation?: string
  countedAt: string
  extra?: boolean
}

export function batchKey(sessionId: string) {
  return `stocktake-counts-${sessionId}`
}

function isCountLine(value: unknown): value is StocktakeCountLine {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.clientId === 'string' &&
    typeof row.code === 'string' &&
    typeof row.countedQty === 'string' &&
    typeof row.countedAt === 'string'
  )
}

export function loadBatch(sessionId: string): StocktakeCountLine[] {
  try {
    const raw = localStorage.getItem(batchKey(sessionId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCountLine)
  } catch {
    return []
  }
}

export function saveBatch(sessionId: string, lines: StocktakeCountLine[]) {
  localStorage.setItem(batchKey(sessionId), JSON.stringify(lines))
}

export function clearBatch(sessionId: string) {
  localStorage.removeItem(batchKey(sessionId))
}

export function addBatch(
  sessionId: string,
  line: {
    code: string
    countedQty: string
    countedStatus?: string
    countedLocation?: string
    extra?: boolean
  },
): StocktakeCountLine {
  const next: StocktakeCountLine = {
    clientId: crypto.randomUUID(),
    countedAt: new Date().toISOString(),
    ...line,
  }
  saveBatch(sessionId, [...loadBatch(sessionId), next])
  return next
}
