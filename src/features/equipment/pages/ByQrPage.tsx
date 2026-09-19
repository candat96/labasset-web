import { Navigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/page/ErrorState'
import { equipmentByQr } from '../api'

export function Component() {
  const { token = '' } = useParams()
  const result = useQuery({
    queryKey: ['equipment', 'by-qr', token],
    queryFn: () => equipmentByQr(token),
    enabled: !!token,
    retry: false,
  })
  if (result.isPending) return <p role="status">Đang tìm máy…</p>
  if (result.error)
    return (
      <div className="p-8 text-center">
        <ErrorState error={result.error} onRetry={() => void result.refetch()} />
        <p className="mt-4 text-lg font-medium">Không tìm thấy máy</p>
      </div>
    )
  return <Navigate to={`/equipment/${result.data.id}`} replace />
}
