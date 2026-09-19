import { create } from 'zustand'

export type TenantMode = 'multi' | 'single'

interface UiState {
  tenantMode: TenantMode | null
  setTenantMode: (m: TenantMode) => void
  hospitalName: string | null
  setHospitalName: (n: string | null) => void
  /** true khi SSE thất bại liên tục → chuyển sang polling thông báo */
  notificationsPolling: boolean
  setNotificationsPolling: (v: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  tenantMode: null,
  setTenantMode: (tenantMode) => set({ tenantMode }),
  hospitalName: null,
  setHospitalName: (hospitalName) => set({ hospitalName }),
  notificationsPolling: false,
  setNotificationsPolling: (notificationsPolling) => set({ notificationsPolling }),
}))
