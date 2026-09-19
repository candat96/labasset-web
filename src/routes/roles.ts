export const ROLES = ['HOSPITAL_ADMIN', 'EQUIPMENT_STAFF', 'DEPT_HEAD', 'DEPT_USER'] as const
export type Role = (typeof ROLES)[number]

/** Quản trị viện */
export const ADM: readonly Role[] = ['HOSPITAL_ADMIN']
/** Quản trị viện + nhân viên vật tư – TBYT */
export const STAFF: readonly Role[] = ['HOSPITAL_ADMIN', 'EQUIPMENT_STAFF']
/** STAFF + trưởng khoa */
export const HEADS: readonly Role[] = ['HOSPITAL_ADMIN', 'EQUIPMENT_STAFF', 'DEPT_HEAD']
/** Mọi vai trò đã đăng nhập */
export const ALL: readonly Role[] = [...ROLES]
