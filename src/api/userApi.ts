import type { AuditLog, CreateUserRequest, PageQuery, Role, UpdateUserRequest, User } from '@/types/api'
import { getPage, params, patch, post, put } from './helpers'

export interface UserListQuery extends PageQuery {
  search?: string
  role?: Role
  active?: boolean
}

export const userApi = {
  list: (query: UserListQuery = {}) =>
    getPage<User>('/users', params(query as Record<string, unknown>)),

  create: (body: CreateUserRequest) => post<CreateUserRequest, User>('/users', body),

  update: (userId: string, body: UpdateUserRequest) =>
    put<UpdateUserRequest, User>(`/users/${userId}`, body),

  /** Activate / deactivate a user (18.4). */
  setStatus: (userId: string, body: { active: boolean }) =>
    patch<{ active: boolean }, void>(`/users/${userId}/status`, body),
}

export interface AuditLogQuery extends PageQuery {
  userId?: string
  entityType?: string
  action?: AuditLog['action']
  from?: string
  to?: string
}

export const auditApi = {
  list: (query: AuditLogQuery = {}) =>
    getPage<AuditLog>('/audit-logs', params(query as Record<string, unknown>)),
}
