import type { Role } from '@/routes/roles'
export const roleLabels: Record<Role, string> = {
  HOSPITAL_ADMIN: 'Quản trị viện',
  EQUIPMENT_STAFF: 'Nhân viên vật tư',
  DEPT_HEAD: 'Trưởng khoa',
  DEPT_USER: 'Nhân viên khoa',
}
