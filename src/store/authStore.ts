import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthResponse, User } from '@/types/api'

/**
 * Authentication store.
 *
 * Tokens are persisted to localStorage so a hard refresh keeps the session.
 * This is standard practice for internal SPAs; no passwords or third-party
 * secrets (e.g. Shopify tokens) are ever stored client-side.
 */
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  setSession: (data: AuthResponse) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  setStatus: (status: AuthState['status']) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'idle',
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user,
          status: 'authenticated',
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setStatus: (status) => set({ status }),
      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          status: 'unauthenticated',
        }),
    }),
    {
      name: 'bo-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)

export function selectRole(): import('@/types/api').Role | null {
  return useAuthStore.getState().user?.role ?? null
}
