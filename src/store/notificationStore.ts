import { create } from 'zustand'
import type { AppNotification } from '@/types/api'

/**
 * Client-side mirror of the notification state used by the header bell.
 * Server data is always the source of truth; this store only caches the
 * unread count / latest items for instant UI feedback.
 */
interface NotificationState {
  items: AppNotification[]
  unreadCount: number
  loaded: boolean
  setItems: (items: AppNotification[]) => void
  markRead: (id: string) => void
  markAllRead: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  loaded: false,
  setItems: (items) =>
    set({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      loaded: true,
    }),
  markRead: (id) =>
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { items, unreadCount: items.filter((n) => !n.read).length }
    }),
  markAllRead: () =>
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  reset: () => set({ items: [], unreadCount: 0, loaded: false }),
}))
