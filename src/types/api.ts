/**
 * Shared domain + API types.
 * Source of truth: business-operations-api-documentation.md
 *
 * Shapes explicitly documented in the contract are reproduced exactly.
 * Where the contract does not spell out every field of a detail response,
 * the minimal fields needed by the UI are typed and marked `inferred`
 * below — update them together with the API documentation when the
 * backend evolves (contract-first rule).
 */

/* ------------------------------- Auth ---------------------------------- */

export type Role = 'OWNER' | 'MANAGER' | 'WAREHOUSE_STAFF' | 'PURCHASING' | 'ACCOUNTANT'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active?: boolean // inferred: used by /users screens
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RegisterResponse {
  user: User
  accessToken: string
  refreshToken: string
}

/* ----------------------------- Pagination ------------------------------- */

/** Standard pagination contract (section 24). */
export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first?: boolean
  last?: boolean
}

export interface PageQuery {
  page?: number
  size?: number
  sort?: string
}

export interface DateRange {
  from?: string
  to?: string
}

/* ----------------------------- Error shape ------------------------------ */

export interface FieldError {
  field: string
  message: string
}

/** Standard error response (section 23). */
export interface ApiErrorBody {
  timestamp?: string
  status: number
  code: ApiErrorCode
  message: string
  path?: string
  errors?: FieldError[]
  traceId?: string
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'DUPLICATE_RESOURCE'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_STATE_TRANSITION'
  | 'SHOPIFY_API_ERROR'
  | 'SHOPIFY_WEBHOOK_INVALID'
  | 'INTEGRATION_ERROR'
  | 'BUSINESS_RULE_VIOLATION'
  | 'INTERNAL_ERROR'

/* ------------------------------ Dashboard ------------------------------- */

export interface DashboardSummary {
  sales: {
    gross: number
    net: number
    growthPercent: number
  }
  orders: {
    total: number
    pending: number
    processing: number
    packed: number
    shipped: number
    delivered: number
  }
  inventory: {
    totalSkus: number
    lowStockSkus: number
    outOfStockSkus: number
    inventoryValue: number
  }
  profit: {
    estimated: number
    marginPercent: number
  }
  returns: {
    count: number
    ratePercent: number
  }
}

export interface SalesPoint {
  date: string
  sales: number
  orders: number
}

export interface TopProduct {
  productId: string
  sku: string
  name: string
  category: string
  unitsSold: number
  revenue: number
}

export interface LowStockItem {
  productId: string
  sku: string
  name: string
  availableStock: number
  minimumStock: number
  warehouse: string
}

export interface DashboardAlert {
  id: string
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DELAYED_ORDER' | 'PURCHASE_ORDER' | 'RETURN_REQUEST' | 'SYSTEM'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  createdAt: string
}

/* ------------------------------- Products -------------------------------- */

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  categoryId: string
  description?: string
  sellingPrice: number
  costPrice: number
  taxRate?: number
  weightGrams?: number
  barcode?: string
  supplierId?: string
  supplierName?: string // inferred
  stock: number
  availableStock: number
  minimumStock: number
  status: ProductStatus
  createdAt: string // inferred
  variants?: ProductVariant[] // inferred
}

export interface ProductVariant {
  id: string
  sku: string
  name: string
  attributes: Record<string, string>
  price: number
  stock: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface ProductLocation {
  id: string
  binCode: string
  warehouseName: string
  quantity: number
}

export interface Category {
  id: string
  name: string
  description?: string
  productCount: number // inferred
}

/* ------------------------------- Inventory ------------------------------- */

export interface InventoryItem {
  productId: string
  sku: string
  name: string
  warehouseId?: string
  warehouseName?: string
  binCode?: string
  physicalStock: number
  reservedStock: number
  availableStock: number
  damagedStock: number
  incomingStock: number
  minimumStock: number
}

export interface InventoryDetail extends InventoryItem {
  reservations: Reservation[] // inferred
}

export interface Reservation {
  id: string
  orderId: string
  orderNumber: string
  quantity: number
  createdAt: string
  expiresAt?: string
}

export interface InventoryMovement {
  id: string
  productId: string
  type: 'PURCHASE_RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'RESERVATION' | 'RELEASE' | 'RETURN_RESTOCK'
  quantity: number
  fromBin?: string
  toBin?: string
  reason?: string
  note?: string
  createdBy: string
  createdAt: string
}

export interface AdjustInventoryRequest {
  quantity: number
  reason: string
  note?: string
}

/* ------------------------------- Warehouse ------------------------------- */

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  city: string
  active: boolean
  zoneCount?: number
  binCount?: number
}

export interface Zone {
  id: string
  warehouseId: string
  code: string
  name: string
  description?: string
}

export interface Rack {
  id: string
  warehouseId: string
  zoneId: string
  code: string
}

export interface Shelf {
  id: string
  warehouseId: string
  rackId: string
  code: string
}

export interface Bin {
  id: string
  code: string
  warehouseId: string
  zoneId?: string
  rackId?: string
  shelfId?: string
  capacity: number
  occupied: number
  availableCapacity: number
  active?: boolean
}

/* -------------------------------- Orders --------------------------------- */

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKING'
  | 'PICKED'
  | 'PACKING'
  | 'PACKED'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export interface OrderItem {
  id: string
  productId: string
  sku: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderSummary {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  status: OrderStatus
  itemCount: number
  total: number
  channel: 'SHOPIFY'
  createdAt: string
}

export interface Order extends OrderSummary {
  customerPhone?: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress?: Address
  payment: {
    method: string
    status: 'PAID' | 'PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    transactionId: string
    paidAt?: string
  }
  subtotal: number
  shippingFee: number
  discount: number
  tax: number
  total: number
  shippingMethod?: string
  trackingNumber?: string
  cancelledAt?: string
  cancellationReason?: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface OrderStatusHistoryEntry {
  id: string
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  note?: string
  changedBy: string
  changedAt: string
}

export type UpdateOrderStatusRequest = {
  status: OrderStatus
}

/* ------------------------------ Picking ---------------------------------- */

export interface PickListItem {
  itemId: string // inferred: required by POST /pick-lists/{id}/items/{itemId}/pick
  productId: string
  sku: string
  name?: string
  quantity: number
  pickedQuantity: number
  location: string
  picked: boolean
  shortage?: boolean
}

export interface PickList {
  pickListId: string
  orderId: string
  orderNumber?: string
  assignedPicker?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt?: string
  items: PickListItem[]
}

export interface PickItemRequest {
  pickedQuantity: number
  shortage?: boolean
  note?: string
}

/* ------------------------------ Packing ---------------------------------- */

export interface PackingTask {
  packingId: string
  orderId: string
  orderNumber?: string
  status: 'OPEN' | 'COMPLETED'
  items: {
    productId: string
    sku: string
    name: string
    quantity: number
    verified: boolean
  }[]
  packageCount?: number
  weightGrams?: number
  packagingType?: PackagingType
  createdAt?: string
}

export type PackagingType = 'SMALL_BOX' | 'MEDIUM_BOX' | 'LARGE_BOX' | 'BUBBLE_MAILER' | 'POLY_BAG'

export interface ConfirmPackageRequest {
  packageCount: number
  weightGrams: number
  packagingType: PackagingType
}

/* ------------------------------ Suppliers -------------------------------- */

export type PaymentTerms = 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'PREPAID' | 'COD'

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  leadTimeDays: number
  paymentTerms: PaymentTerms
  status: 'ACTIVE' | 'INACTIVE'
  address?: string
  notes?: string
}

/* ---------------------------- Purchase orders ----------------------------- */

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'

export interface PurchaseOrderItem {
  productId: string
  sku: string
  name: string
  quantity: number
  unitCost: number
  lineTotal: number
  receivedQuantity?: number
  damagedQuantity?: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  warehouseId?: string
  status: PurchaseOrderStatus
  items: PurchaseOrderItem[]
  total: number
  expectedDeliveryDate?: string
  createdAt: string
  statusHistory: PurchaseOrderStatusEvent[]
}

export interface PurchaseOrderStatusEvent {
  status: PurchaseOrderStatus
  note?: string
  changedBy: string
  changedAt: string
}

export interface CreatePurchaseOrderRequest {
  supplierId: string
  expectedDeliveryDate?: string
  items: {
    productId: string
    quantity: number
    unitCost: number
  }[]
}

export interface ReceivePurchaseOrderRequest {
  items: {
    productId: string
    receivedQuantity: number
    damagedQuantity: number
  }[]
}

/* -------------------------------- Returns --------------------------------- */

export type ReturnReason = 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'QUALITY' | 'CUSTOMER_CHANGED_MIND'
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'INSPECTED' | 'RESOLVED'
export type ReturnResolution = 'REFUND' | 'REPLACEMENT'
export type ItemCondition = 'GOOD' | 'DAMAGED' | 'DEFECTIVE'

export interface ReturnItem {
  orderItemId: string
  productId: string
  sku: string
  name: string
  quantity: number
}

export interface ReturnRequest {
  id: string
  returnNumber: string
  orderId: string
  orderNumber: string
  customerName: string
  status: ReturnStatus
  reason: ReturnReason
  items: ReturnItem[]
  refundAmount: number
  inspection?: {
    condition: ItemCondition
    restockable: boolean
    notes?: string
  }
  resolution?: ReturnResolution
  createdAt: string
}

/* ------------------------------- Customers -------------------------------- */

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  segment: 'VIP' | 'REPEAT' | 'NEW'
  totalOrders: number
  totalSpent: number
  createdAt: string
  addresses: Address[]
}

export interface CustomerAnalytics {
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  firstPurchase: string
  lastPurchase: string
  segment: Customer['segment']
}

/* ------------------------------- Analytics -------------------------------- */

export interface ProfitSummary {
  revenue: number
  productCost: number
  shippingCost: number
  packagingCost: number
  paymentFees: number
  discounts: number
  estimatedProfit: number
  profitMarginPercent: number
}

export interface ProductProfitability {
  productId: string
  sku: string
  name: string
  unitsSold: number
  revenue: number
  cost: number
  profit: number
  marginPercent: number
}

export interface DeadStockItem {
  productId: string
  sku: string
  name: string
  stock: number
  stockValue: number
  lastSoldAt: string
  daysSinceLastSale: number
}

export interface BestSeller {
  productId: string
  sku: string
  name: string
  category: string
  unitsSold: number
  revenue: number
}

export interface InventoryValuation {
  totalValue: number
  totalUnits: number
  totalSkus: number
  byCategory: {
    category: string
    units: number
    value: number
  }[]
}

/* ----------------------------- Notifications ------------------------------ */

export type NotificationType =
  | 'LOW_STOCK'
  | 'NEW_ORDER'
  | 'DELAYED_ORDER'
  | 'PURCHASE_ORDER_UPDATE'
  | 'RETURN_REQUEST'
  | 'SYSTEM'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

/* ------------------------------ Users / audit ------------------------------ */

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: Role
}

export interface UpdateUserRequest {
  name?: string
  role?: Role
  active?: boolean
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  entityType: string
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN'
  summary: string
  createdAt: string
}

/* -------------------------------- Shopify ---------------------------------- */

export interface ShopifyIntegration {
  connected: boolean
  shopDomain: string
  storeName: string
  scopes: string[]
  connectedAt?: string
  sync: {
    products: SyncStatus
    orders: SyncStatus
    inventory: SyncStatus
    customers: SyncStatus
  }
}

export interface SyncStatus {
  status: 'IDLE' | 'RUNNING' | 'FAILED'
  lastSyncAt?: string
  lastError?: string
}

export interface SyncResult {
  started: boolean
  message: string
}

export interface SyncLog {
  id: string
  type: 'PRODUCTS' | 'ORDERS' | 'INVENTORY' | 'CUSTOMERS' | 'FULL'
  status: 'SUCCESS' | 'FAILED'
  message: string
  recordsProcessed: number
  createdAt: string
}

/* ------------------------------ Misc --------------------------------------- */

export interface HealthStatus {
  status: string
}
