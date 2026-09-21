import { enumLabel } from '@/lib/enum-labels'

/** Nhãn vai trò từ map tập trung; vai trò lạ (API mới) hiện nguyên chuỗi. */
export function useRoleLabel() {
  return (role: string) => enumLabel('role', role)
}
