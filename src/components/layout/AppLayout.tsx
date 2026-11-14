import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PageLoader } from '@/components/ui/primitives'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/authApi'
import { enableMocksIfConfigured } from '@/api/axiosInstance'

/**
 * Authenticated app shell: sidebar + header + main content.
 * Restores the session (GET /auth/me) when the store was rehydrated
 * from localStorage without a fresh user load.
 */
export function AppLayout() {
  const { accessToken, user, setUser, clear } = useAuthStore()

  useEffect(() => {
    void enableMocksIfConfigured()
  }, [])

  useEffect(() => {
    const onSessionExpired = () => {
      clear()
    }
    window.addEventListener('bo:session-expired', onSessionExpired)
    return () => window.removeEventListener('bo:session-expired', onSessionExpired)
  }, [clear])

  useEffect(() => {
    if (accessToken && !user) {
      authApi
        .me()
        .then((me) => setUser(me))
        .catch(() => clear())
    }
  }, [accessToken, user, setUser, clear])

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
