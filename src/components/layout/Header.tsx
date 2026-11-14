import { useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CircleUser, LogOut, Menu, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AppNotification } from '@/types/api'
import { authApi } from '@/api/authApi'
import { notificationApi } from '@/api/notificationApi'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'
import { Breadcrumbs, type Crumb } from '@/components/ui/PageHeader'
import { Badge, IconButton } from '@/components/ui/primitives'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { humanize, relativeTime } from '@/utils/date'

/* --------------------------- Notification bell ---------------------------- */

function NotificationBell() {
  const navigate = useNavigate()
  const { items, unreadCount, setItems, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    notificationApi
      .list({ size: 20 })
      .then((page) => setItems(page.content as AppNotification[]))
      .catch(() => undefined)
  }, [setItems])

  const onMarkRead = async (n: AppNotification) => {
    if (n.read) return
    try {
      await notificationApi.markRead(n.id)
      markRead(n.id)
    } catch {
      toast.error('Could not mark notification as read')
    }
  }

  const onMarkAll = async () => {
    try {
      await notificationApi.markAllRead()
      markAllRead()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Could not mark notifications as read')
    }
  }

  return (
    <Dropdown
      label="Notifications"
      trigger={
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-shade-30/40">
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button type="button" onClick={onMarkAll} className="text-xs text-shade-50 underline hover:text-ink">
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-shade-50">No notifications</li>}
            {items.slice(0, 8).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left hover:bg-shade-30/30 ${n.read ? 'opacity-60' : ''}`}
                  onClick={() => {
                    void onMarkRead(n)
                    close()
                    if (n.link) navigate(n.link)
                  }}
                >
                  <span className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-red" aria-hidden />}
                    <span className="text-sm font-medium">{n.title}</span>
                    <Badge tone="slate">{humanize(n.type)}</Badge>
                  </span>
                  <span className="line-clamp-2 text-xs text-shade-50">{n.message}</span>
                  <span className="text-[11px] text-shade-40">{relativeTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-hairline px-3 py-2">
            <Link to="/notifications" onClick={close} className="block text-center text-xs font-medium text-ink underline">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </Dropdown>
  )
}

/* ------------------------------ User menu ---------------------------------- */

function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const resetNotifications = useNotificationStore((s) => s.reset)

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // best-effort — session is cleared regardless
    }
    clear()
    resetNotifications()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }, [clear, navigate, resetNotifications])

  return (
    <Dropdown
      label="Account menu"
      trigger={
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white py-1.5 pl-1.5 pr-3 hover:border-shade-30">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden>
            {user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('') ?? '?'}
          </span>
          <span className="hidden text-sm font-medium sm:block">{user?.name ?? 'Account'}</span>
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="border-b border-hairline px-3 py-2.5">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-shade-50">{user?.email}</p>
            <p className="mt-1 text-xs">
              <Badge tone="aloe">{humanize(user?.role ?? '')}</Badge>
            </p>
          </div>
          <div className="pt-1.5">
            <DropdownItem onClick={() => { close(); navigate('/settings') }}>
              <Settings className="h-4 w-4" aria-hidden /> Settings
            </DropdownItem>
            <DropdownItem onClick={() => { close(); navigate('/shopify') }}>
              <CircleUser className="h-4 w-4" aria-hidden /> Shopify Integration
            </DropdownItem>
            <DropdownItem danger onClick={() => { close(); void logout() }}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </DropdownItem>
          </div>
        </div>
      )}
    </Dropdown>
  )
}

/* -------------------------------- Header ----------------------------------- */

const CRUMB_OVERRIDES: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  warehouses: 'Warehouses',
  orders: 'Orders',
  picking: 'Picking',
  packing: 'Packing',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  returns: 'Returns',
  customers: 'Customers',
  analytics: 'Analytics',
  notifications: 'Notifications',
  users: 'Users & Roles',
  'audit-logs': 'Audit Logs',
  shopify: 'Shopify',
  settings: 'Settings',
}

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const crumbs: Crumb[] = segments.map((seg, i) => {
    const isId = /^[a-z]+-\d+$/i.test(seg) || /^p-\d+$/.test(seg) || /^o-\d+$/.test(seg)
    const label = isId ? 'Detail' : (CRUMB_OVERRIDES[seg] ?? humanize(seg))
    return { label, to: i < segments.length - 1 ? `/${segments.slice(0, i + 1).join('/')}` : undefined }
  })

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <IconButton label="Open navigation" onClick={toggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1">
          {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
