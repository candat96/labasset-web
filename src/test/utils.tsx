import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import '@/lib/i18n'

/** Render trong QueryClient + memory router; trả router để kiểm tra điều hướng. */
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', routes = [] as RouteObject[], path = '*' } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([{ path, element: ui }, ...routes], {
    initialEntries: [route],
  })
  const result = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return { ...result, router, client }
}

export const fakeUser = (roles: string[] = ['HOSPITAL_ADMIN'], extra = {}) => ({
  id: 'u1',
  username: 'admin',
  fullName: 'Quản trị viên',
  email: null,
  phone: null,
  departmentId: null,
  roles,
  mustChangePassword: false,
  otpEnabled: false,
  ...extra,
})

export const fakeSession = (roles?: string[]) => ({
  accessToken: 'A1',
  refreshToken: 'R1',
  tenantId: 'T1',
  user: fakeUser(roles),
})
