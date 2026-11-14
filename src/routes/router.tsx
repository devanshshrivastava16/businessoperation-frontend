import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, RedirectIfAuthenticated, RequireRole } from './guards'
import NotFoundPage from '@/features/NotFoundPage'

// Route-level code splitting: every feature page is lazy-loaded.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ProductListPage = lazy(() => import('@/features/products/ProductListPage'))
const ProductDetailPage = lazy(() => import('@/features/products/ProductDetailPage'))
const CategoryPage = lazy(() => import('@/features/products/CategoryPage'))
const InventoryListPage = lazy(() => import('@/features/inventory/InventoryListPage'))
const InventoryDetailPage = lazy(() => import('@/features/inventory/InventoryDetailPage'))
const WarehouseListPage = lazy(() => import('@/features/warehouse/WarehouseListPage'))
const WarehouseDetailPage = lazy(() => import('@/features/warehouse/WarehouseDetailPage'))
const OrderListPage = lazy(() => import('@/features/orders/OrderListPage'))
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'))
const PickingPage = lazy(() => import('@/features/picking/PickingPage'))
const PackingPage = lazy(() => import('@/features/packing/PackingPage'))
const SupplierPage = lazy(() => import('@/features/suppliers/SupplierPage'))
const PurchaseOrderListPage = lazy(() => import('@/features/purchasing/PurchaseOrderListPage'))
const PurchaseOrderDetailPage = lazy(() => import('@/features/purchasing/PurchaseOrderDetailPage'))
const ReturnPage = lazy(() => import('@/features/returns/ReturnPage'))
const ReturnDetailPage = lazy(() => import('@/features/returns/ReturnDetailPage'))
const CustomerListPage = lazy(() => import('@/features/customers/CustomerListPage'))
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const AuditLogsPage = lazy(() => import('@/features/users/AuditLogsPage'))
const ShopifyPage = lazy(() => import('@/features/shopify/ShopifyPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          // Catalog
          { path: 'products', element: <RequireRole module="Products"><ProductListPage /></RequireRole> },
          { path: 'products/:productId', element: <RequireRole module="Products"><ProductDetailPage /></RequireRole> },
          { path: 'categories', element: <RequireRole module="Products"><CategoryPage /></RequireRole> },
          // Inventory & warehouse
          { path: 'inventory', element: <RequireRole module="Inventory"><InventoryListPage /></RequireRole> },
          { path: 'inventory/:productId', element: <RequireRole module="Inventory"><InventoryDetailPage /></RequireRole> },
          { path: 'warehouses', element: <RequireRole module="Warehouse"><WarehouseListPage /></RequireRole> },
          { path: 'warehouses/:warehouseId', element: <RequireRole module="Warehouse"><WarehouseDetailPage /></RequireRole> },
          // Fulfillment
          { path: 'orders', element: <RequireRole module="Orders"><OrderListPage /></RequireRole> },
          { path: 'orders/:orderId', element: <RequireRole module="Orders"><OrderDetailPage /></RequireRole> },
          { path: 'picking', element: <RequireRole module="Orders" min="limited"><PickingPage /></RequireRole> },
          { path: 'packing', element: <RequireRole module="Orders" min="limited"><PackingPage /></RequireRole> },
          // Procurement
          { path: 'suppliers', element: <RequireRole module="Suppliers"><SupplierPage /></RequireRole> },
          { path: 'purchase-orders', element: <RequireRole module="Purchasing"><PurchaseOrderListPage /></RequireRole> },
          { path: 'purchase-orders/:purchaseOrderId', element: <RequireRole module="Purchasing"><PurchaseOrderDetailPage /></RequireRole> },
          // After sales
          { path: 'returns', element: <RequireRole module="Returns"><ReturnPage /></RequireRole> },
          { path: 'returns/:returnId', element: <RequireRole module="Returns"><ReturnDetailPage /></RequireRole> },
          { path: 'customers', element: <RequireRole module="Customers"><CustomerListPage /></RequireRole> },
          { path: 'customers/:customerId', element: <RequireRole module="Customers"><CustomerDetailPage /></RequireRole> },
          // Administration
          { path: 'analytics', element: <RequireRole module="Profit" min="limited"><AnalyticsPage /></RequireRole> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'users', element: <RequireRole module="Users"><UsersPage /></RequireRole> },
          { path: 'audit-logs', element: <RequireRole module="AuditLogs"><AuditLogsPage /></RequireRole> },
          { path: 'shopify', element: <ShopifyPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
