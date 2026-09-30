/**
 * Kết quả nhập Excel (dùng chung cho danh mục, khoa, vật tư, thiết bị).
 *
 * API nhập theo từng dòng: các dòng đúng được ghi, dòng sai báo riêng. Vì vậy
 * một kết quả có thể vừa có `created`/`updated` > 0 vừa có `errors` không rỗng —
 * KHÔNG được ngầm hiểu "có lỗi = không ghi được dòng nào".
 */
export interface ImportRowError {
  row: number
  /** Tên cột gây lỗi (API có thể trả thiếu). */
  field?: string | null
  message: string
}

export interface ImportResultData {
  created: number
  updated: number
  errors: ImportRowError[]
  /** Mã server tự sinh cho dòng để trống Mã — một số danh mục trả kèm. */
  createdCodes?: string[]
}

/** Số dòng đã ghi được = tạo mới + cập nhật. */
export const importedCount = (result: Pick<ImportResultData, 'created' | 'updated'>) =>
  result.created + result.updated
