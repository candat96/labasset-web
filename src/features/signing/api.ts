import { unwrap, unwrapAs, untypedApi } from '@/api/client'

/**
 * Cài đặt và dùng chữ ký số (nhà cung cấp Intrust).
 *
 * Các endpoint `/v1/me/signing-profile`, `/v1/signing/...` và `/v1/documents/.../sign(ed)`
 * CHƯA có trong OpenAPI (`src/api/schema.d.ts`) nên API ở đây khai tay; khi backend bổ
 * sung swagger thì thay `untypedApi` bằng client `api` có kiểu (xem README mục "API còn thiếu").
 */

export type SignSlot = 'handler' | 'department' | 'leader' | 'accounting'

export const SIGN_SLOTS: readonly SignSlot[] = ['handler', 'department', 'leader', 'accounting']

export const SIGN_SLOT_LABELS: Record<SignSlot, string> = {
  handler: 'Người thực hiện',
  department: 'Trưởng khoa',
  leader: 'Lãnh đạo',
  accounting: 'Kế toán',
}

/** Bảy loại chứng từ ký số được (khớp adapter ở backend). */
export const DOC_TYPES = [
  'repair.completion',
  'maintenance.task',
  'calibration.result',
  'stock.receipt',
  'stock.issue',
  'stocktake.result',
  'demand.proposal',
] as const

export type DocType = (typeof DOC_TYPES)[number]

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  'repair.completion': 'Biên bản sửa chữa',
  'maintenance.task': 'Biên bản bảo dưỡng',
  'calibration.result': 'Biên bản kiểm định',
  'stock.receipt': 'Phiếu nhập kho',
  'stock.issue': 'Phiếu xuất kho',
  'stocktake.result': 'Biên bản kiểm kê',
  'demand.proposal': 'Phiếu đề nghị cấp vật tư',
}

/**
 * Ô ký có trong mẫu gốc của từng loại chứng từ. Mẫu có thể bị viện sửa (thêm/bớt ô),
 * khi đó server trả `SIGNATURE_SLOT_NOT_IN_TEMPLATE` — thông báo tiếng Việt sẽ chỉ rõ.
 */
export const DOC_DEFAULT_SLOTS: Record<DocType, SignSlot[]> = {
  'repair.completion': ['handler', 'department'],
  'maintenance.task': ['handler', 'department'],
  'calibration.result': ['handler', 'department'],
  'stock.receipt': ['handler', 'accounting', 'leader'],
  'stock.issue': ['handler', 'accounting', 'leader'],
  'stocktake.result': ['handler', 'accounting', 'leader'],
  'demand.proposal': ['handler', 'department', 'leader'],
}

/** Hồ sơ chữ ký số trả về — chỉ có cờ đã đặt mật khẩu/PIN, KHÔNG có giá trị. */
export interface SigningProfileView {
  userId: string
  providerKey: string
  username: string
  credentialId: string
  certSerial: string
  certSubject: string
  certValidFrom: string
  certValidTo: string
  sessionExpiresAt: string | null
  rememberPin: boolean
  expiringSoon: boolean
  passwordSet: boolean
  pinSet: boolean
}

export interface SigningProfileResponse {
  profile: SigningProfileView | null
  configured: boolean
}

export interface SaveSigningProfileBody {
  username: string
  /** Bỏ trống = giữ mật khẩu cũ. */
  password?: string
  /** Chỉ lưu khi `rememberPin` bật. */
  pin?: string
  rememberPin?: boolean
  credentialId: string
  certSerial: string
  certSubject: string
  certValidFrom: string
  certValidTo: string
  providerKey?: string
}

export interface SigningCertificate {
  keyId: string
  serial: string
  subject: string
  displayName: string
  provider: string
  validFrom: string
  validTo: string
}

export interface SigningConfigView {
  providerKey: string
  baseUrl: string
  username: string
  enabled: boolean
  passwordSet: boolean
}

export interface SaveSigningConfigBody {
  baseUrl: string
  username: string
  /** Bỏ trống = giữ mật khẩu cũ; chuỗi rỗng = xoá. */
  password?: string
  providerKey?: string
  enabled?: boolean
}

export interface SignedDocument {
  attachmentId: string
  fileId: string
  name: string
  label: string | null
  signedAt: string
  /** Liên kết tải có hạn do kho tệp cấp; mở tab mới để tải. */
  url: string
}

export interface SignDocumentBody {
  slot: SignSlot
  password?: string
  pin?: string
}

export interface SignDocumentResult {
  fileId: string
  attachmentId: string
}

export const signingKeys = {
  profile: ['signing-profile'] as const,
  certificates: (username: string) => ['signing-certificates', username] as const,
  config: ['signing-config'] as const,
  signed: (docType: string, id: string) => ['signed-documents', docType, id] as const,
}

/** `GET /v1/me/signing-profile` */
export const getSigningProfile = () =>
  unwrapAs<SigningProfileResponse>(untypedApi.GET('/v1/me/signing-profile'))

/** `PUT /v1/me/signing-profile` */
export const saveSigningProfile = (body: SaveSigningProfileBody) =>
  unwrapAs<SigningProfileView>(untypedApi.PUT('/v1/me/signing-profile', { body }))

/** `POST /v1/me/signing-profile/session/clear` → 204 */
export const clearSigningSession = () =>
  unwrap(untypedApi.POST('/v1/me/signing-profile/session/clear'))

/** `GET /v1/signing/certificates?username=` */
export const listCertificates = (username: string) =>
  unwrapAs<SigningCertificate[]>(
    untypedApi.GET('/v1/signing/certificates', { params: { query: { username } } }),
  )

/** `GET /v1/signing/config` (HOSPITAL_ADMIN) */
export const getSigningConfig = () =>
  unwrapAs<SigningConfigView>(untypedApi.GET('/v1/signing/config'))

/** `PUT /v1/signing/config` (HOSPITAL_ADMIN) */
export const saveSigningConfig = (body: SaveSigningConfigBody) =>
  unwrapAs<SigningConfigView>(untypedApi.PUT('/v1/signing/config', { body }))

/** `POST /v1/documents/:docType/:id/sign` */
export const signDocument = (docType: string, id: string, body: SignDocumentBody) =>
  unwrapAs<SignDocumentResult>(
    untypedApi.POST(`/v1/documents/${encodeURIComponent(docType)}/${encodeURIComponent(id)}/sign`, {
      body,
    }),
  )

/** `GET /v1/documents/:docType/:id/signed` */
export const listSignedDocuments = (docType: string, id: string) =>
  unwrapAs<SignedDocument[]>(
    untypedApi.GET(`/v1/documents/${encodeURIComponent(docType)}/${encodeURIComponent(id)}/signed`),
  )
