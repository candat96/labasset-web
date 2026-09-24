import { untypedApi, unwrapAs } from '@/api/client'

/**
 * Số máy theo **mã phòng** — từ báo cáo `equipment.byRoom`
 * (`RoomResponseDto` chưa có `equipmentCount`).
 */
export async function roomEquipmentCounts(): Promise<Map<string, number>> {
  const result = await unwrapAs<{ rows: { roomCode?: string | null; total?: number }[] }>(
    untypedApi.GET('/v1/reports/equipment.byRoom', {
      params: { query: { format: 'json', page: 1, limit: 200 } },
    }),
  )
  const counts = new Map<string, number>()
  for (const row of result.rows)
    if (typeof row.roomCode === 'string')
      counts.set(row.roomCode, (counts.get(row.roomCode) ?? 0) + Number(row.total ?? 0))
  return counts
}
