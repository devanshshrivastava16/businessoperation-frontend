import type { Role } from '@/types/api'
import { can, type AccessLevel } from '@/utils/permissions'
import { useAuthStore } from '@/store/authStore'

interface PermissionGateProps {
  module: string
  min?: AccessLevel
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Renders children only when the current user's role has at least `min`
 * access to `module` (matrix in utils/permissions.ts).
 * UI affordance only — the backend remains the authority.
 */
export function PermissionGate({ module, min = 'read', children, fallback = null }: PermissionGateProps) {
  const role: Role | null = useAuthStore((s) => s.user?.role ?? null)
  if (!can(role, module, min)) return <>{fallback}</>
  return <>{children}</>
}
