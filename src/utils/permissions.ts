/**
 * Frontend authorization matrix.
 *
 * Mirrors section 25 of business-operations-api-documentation.md.
 * IMPORTANT: this only drives navigation and UI affordances.
 * The Spring Boot backend remains the final authority — a hidden button is
 * convenience, not security.
 */

import type { Role } from '@/types/api'

export type AccessLevel = 'full' | 'update' | 'read' | 'limited' | 'no'

/** module -> role -> level, exactly as documented in section 25. */
const MATRIX: Record<string, Record<Role, AccessLevel>> = {
  Dashboard: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'limited',
    PURCHASING: 'limited',
    ACCOUNTANT: 'full',
  },
  Products: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'read',
    PURCHASING: 'read',
    ACCOUNTANT: 'read',
  },
  Inventory: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'update',
    PURCHASING: 'read',
    ACCOUNTANT: 'read',
  },
  Warehouse: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'update',
    PURCHASING: 'read',
    ACCOUNTANT: 'read',
  },
  Orders: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'update', // fulfillment actions
    PURCHASING: 'read',
    ACCOUNTANT: 'read',
  },
  Purchasing: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'read',
    PURCHASING: 'full',
    ACCOUNTANT: 'read',
  },
  Suppliers: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'read',
    PURCHASING: 'full',
    ACCOUNTANT: 'read',
  },
  Returns: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'update', // inspect
    PURCHASING: 'read',
    ACCOUNTANT: 'full',
  },
  Customers: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'limited',
    PURCHASING: 'read',
    ACCOUNTANT: 'read',
  },
  Profit: {
    OWNER: 'full',
    MANAGER: 'full',
    WAREHOUSE_STAFF: 'no',
    PURCHASING: 'limited',
    ACCOUNTANT: 'full',
  },
  Users: {
    OWNER: 'full',
    MANAGER: 'limited',
    WAREHOUSE_STAFF: 'no',
    PURCHASING: 'no',
    ACCOUNTANT: 'no',
  },
  AuditLogs: {
    OWNER: 'full',
    MANAGER: 'read',
    WAREHOUSE_STAFF: 'no',
    PURCHASING: 'no',
    ACCOUNTANT: 'read',
  },
}

const LEVEL_RANK: Record<AccessLevel, number> = {
  no: 0,
  limited: 1,
  read: 2,
  update: 3,
  full: 4,
}

export const ROLES: Role[] = ['OWNER', 'MANAGER', 'WAREHOUSE_STAFF', 'PURCHASING', 'ACCOUNTANT']

/**
 * Returns the access level of `role` for `module`.
 * Unknown roles default to 'no' (fail closed).
 */
export function accessLevel(role: Role | undefined | null, module: keyof typeof MATRIX | string): AccessLevel {
  if (!role) return 'no'
  return MATRIX[module]?.[role] ?? 'no'
}

/** True when the role's level is at least `min`. */
export function can(role: Role | undefined | null, module: string, min: AccessLevel = 'read'): boolean {
  return LEVEL_RANK[accessLevel(role, module)] >= LEVEL_RANK[min]
}

export function canWrite(role: Role | undefined | null, module: string): boolean {
  return can(role, module, 'update')
}
