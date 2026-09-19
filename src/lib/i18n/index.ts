import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import './zod'
import common from './vi/common.json'
import auth from './vi/auth.json'
import menu from './vi/menu.json'
import errors from './vi/errors.json'
import departments from './vi/departments.json'
import notifications from './vi/notifications.json'
import dashboard from './vi/dashboard.json'

export const resources = {
  vi: { common, auth, menu, errors, departments, notifications, dashboard },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'vi',
  defaultNS: 'common',
  ns: Object.keys(resources.vi),
  interpolation: { escapeValue: false },
})

export default i18n
