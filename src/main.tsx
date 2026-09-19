import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@/lib/i18n'
import './index.css'
import { Providers, queryClient } from './app/providers'
import { router } from './app/router'
import { useAuthStore } from './stores/auth.store'

// Khi phiên bị xoá (logout, refresh thất bại, tenant bị khoá): dọn cache và về màn đăng nhập.
let prevToken = useAuthStore.getState().accessToken
useAuthStore.subscribe((s) => {
  if (prevToken && !s.accessToken) {
    queryClient.clear()
    const reason = s.lastLogoutReason ?? 'manual'
    void router.navigate(reason === 'manual' ? '/login' : `/login?reason=${reason}`, {
      replace: true,
    })
  }
  prevToken = s.accessToken
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
