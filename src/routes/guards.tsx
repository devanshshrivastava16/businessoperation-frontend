import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Role } from '@/types/api'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/utils/permissions'
import { ForbiddenState } from '@/components/ui/primitives'

/** Blocks unauthenticated access; preserves the intended destination. */
export function ProtectedRoute() {
  const { accessToken, status } = useAuthStore()
  const location = useLocation()

  if (!accessToken && status !== 'loading') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Route-level permission check per module (backend is still the authority). */
export function RequireRole({ module, min = 'read', children }: { module: string; min?: 'read' | 'limited'; children?: ReactNode }) {
  const role: Role | null = useAuthStore((s) => s.user?.role ?? null)
  if (!can(role, module, min)) {
    return <ForbiddenState />
  }
  return <>{children ?? <Outlet />}</>
}

/** Prevents the login page from being shown to an authenticated user. */
export function RedirectIfAuthenticated() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (accessToken) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
