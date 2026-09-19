import { api, unwrap } from './client'
export async function uploadFile(file: File) {
  if (!file.size || file.size > 200 * 1024 * 1024) throw new Error('Tệp phải từ 1 byte đến 200 MB')
  const signed = await unwrap(
    api.POST('/v1/files/presign', {
      body: { name: file.name, mime: file.type || 'application/octet-stream', size: file.size },
    }),
  )
  // Presigned storage URL: tuyệt đối không gửi Bearer/X-Tenant-Id tới object storage.
  const uploaded = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: signed.headers,
    body: file,
    credentials: 'omit',
  })
  if (!uploaded.ok) throw new Error('Không tải được tệp lên kho lưu trữ')
  await unwrap(api.POST('/v1/files/{id}/complete', { params: { path: { id: signed.fileId } } }))
  return signed.fileId
}
export function getFileUrl(id: string, thumb = false) {
  return unwrap(
    api.GET('/v1/files/{id}/url', {
      params: { path: { id }, query: thumb ? { variant: 'thumb' } : {} },
    }),
  )
}
