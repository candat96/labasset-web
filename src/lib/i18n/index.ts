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
import catalogs from './vi/catalogs.json'
import users from './vi/users.json'
import settings from './vi/settings.json'
import auditLogs from './vi/audit-logs.json'
import sys from './vi/sys.json'
import equipment from './vi/equipment.json'
import faults from './vi/faults.json'
import repairs from './vi/repairs.json'
import inventory from './vi/inventory.json'
import requests from './vi/requests.json'
import stocktakes from './vi/stocktakes.json'
import maintenance from './vi/maintenance.json'
import calibrations from './vi/calibrations.json'
import reports from './vi/reports.json'
import assistant from './vi/assistant.json'

export const resources = {
  vi: {
    common,
    auth,
    menu,
    errors,
    departments,
    notifications,
    dashboard,
    catalogs,
    users,
    settings,
    'audit-logs': auditLogs,
    sys,
    equipment,
    faults,
    repairs,
    inventory,
    requests,
    stocktakes,
    maintenance,
    calibrations,
    reports,
    assistant,
  },
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
