import { useTranslation } from 'react-i18next'
import { ROLES } from '@/routes/roles'

/** Nhãn vai trò qua i18n; vai trò lạ (API mới) hiện nguyên chuỗi. */
export function useRoleLabel() {
  const { t } = useTranslation('users')
  return (role: string) => (ROLES.some((value) => value === role) ? t(`roles.${role}`) : role)
}
