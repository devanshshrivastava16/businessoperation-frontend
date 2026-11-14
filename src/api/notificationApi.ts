import type { AppNotification, PageQuery } from '@/types/api'
import { getPage, params, patch, post } from './helpers'

export const notificationApi = {
  list: (query: PageQuery & { unreadOnly?: boolean } = {}) =>
    getPage<AppNotification>('/notifications', params(query as Record<string, unknown>)),

  markRead: (notificationId: string) => patch<void, void>(`/notifications/${notificationId}/read`),

  markAllRead: () => post<void, void>('/notifications/read-all'),
}
