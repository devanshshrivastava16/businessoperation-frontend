import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Undo2,
  Users,
  Warehouse as WarehouseIcon,
  Tags,
  FileClock,
  X,
} from 'lucide-react'
import type { Role } from '@/types/api'
import { can } from '@/utils/permissions'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  module: string
  min?: 'read' | 'limited'
  end?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'Dashboard', end: true },
      { to: '/analytics', label: 'Analytics', icon: BarChart3, module: 'Profit' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Package, module: 'Products' },
      { to: '/categories', label: 'Categories', icon: Tags, module: 'Products' },
    ],
  },
  {
    title: 'Inventory & Warehouse',
    items: [
      { to: '/inventory', label: 'Inventory', icon: Boxes, module: 'Inventory' },
      { to: '/warehouses', label: 'Warehouses', icon: WarehouseIcon, module: 'Warehouse' },
    ],
  },
  {
    title: 'Fulfillment',
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingCart, module: 'Orders' },
      { to: '/picking', label: 'Picking', icon: ClipboardList, module: 'Orders' },
      { to: '/packing', label: 'Packing', icon: ClipboardCheck, module: 'Orders' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: Truck, module: 'Suppliers' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardCheck, module: 'Purchasing' },
    ],
  },
  {
    title: 'After Sales',
    items: [
      { to: '/returns', label: 'Returns', icon: Undo2, module: 'Returns' },
      { to: '/customers', label: 'Customers', icon: Users, module: 'Customers' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, module: 'Dashboard' },
      { to: '/users', label: 'Users & Roles', icon: Users, module: 'Users' },
      { to: '/audit-logs', label: 'Audit Logs', icon: FileClock, module: 'AuditLogs' },
      { to: '/shopify', label: 'Shopify', icon: Store, module: 'Dashboard' },
      { to: '/settings', label: 'Settings', icon: Settings, module: 'Dashboard' },
    ],
  },
]

export function Sidebar() {
  const role: Role | null = useAuthStore((s) => s.user?.role ?? null)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-ink text-white' : 'text-shade-60 hover:bg-shade-30/30 hover:text-ink'
    }`

  const content = (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-lg font-semibold tracking-tight text-ink">Luna Ops</p>
          <p className="text-xs text-shade-40">Business Operations</p>
        </div>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-shade-30/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex-1 space-y-5">
        {SECTIONS.map((section) => {
          const visible = section.items.filter((item) => can(role, item.module, item.min ?? 'read'))
          if (visible.length === 0) return null
          return (
            <div key={section.title}>
              <p className="mb-1.5 px-3.5 text-[11px] font-medium uppercase tracking-widest text-shade-40">{section.title}</p>
              <ul className="space-y-0.5">
                {visible.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={linkClass} onClick={() => setSidebarOpen(false)}>
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="border-t border-hairline px-3.5 pt-4">
        <p className="text-[11px] leading-relaxed text-shade-40">
          Internal operations console. Shopify remains the customer-facing storefront.
        </p>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-hairline bg-white lg:block" aria-label="Sidebar">
        {content}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{content}</div>
        </div>
      )}
    </>
  )
}

export { LogOut }
