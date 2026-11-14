/**
 * Deterministic in-memory mock database.
 *
 * ISOLATION RULE (project requirement): this module is only ever imported by
 * `mockAdapter.ts`, which is only imported dynamically when
 * VITE_USE_MOCKS === 'true'. With mocks disabled it never reaches a bundle.
 *
 * All data is clearly synthetic and mirrors the API contract examples
 * (business-operations-api-documentation.md).
 */

import type {
  AppNotification,
  AuditLog,
  BestSeller,
  Bin,
  Category,
  Customer,
  DashboardAlert,
  DashboardSummary,
  DeadStockItem,
  InventoryDetail,
  InventoryItem,
  InventoryMovement,
  LowStockItem,
  Order,
  OrderStatus,
  OrderSummary,
  PackingTask,
  PickList,
  Product,
  PurchaseOrder,
  ReturnRequest,
  SalesPoint,
  Shelf,
  Supplier,
  SyncLog,
  TopProduct,
  User,
  Warehouse,
  Zone,
  Rack,
  ShopifyIntegration,
} from '@/types/api'

/* ------------------------------ rng helpers ------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(42)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
export const between = (min: number, max: number): number => Math.floor(min + rnd() * (max - min + 1))

let idCounter = 0
export function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-${String(idCounter).padStart(4, '0')}`
}

const daysAgo = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(between(9, 20), between(0, 59), 0, 0)
  return d.toISOString()
}

/* --------------------------------- users --------------------------------- */

export const users: User[] = [
  { id: 'u-owner', name: 'Priya Sharma', email: 'owner@demo.io', role: 'OWNER', active: true },
  { id: 'u-manager', name: 'Arjun Mehta', email: 'manager@demo.io', role: 'MANAGER', active: true },
  { id: 'u-warehouse', name: 'Ravi Kumar', email: 'warehouse@demo.io', role: 'WAREHOUSE_STAFF', active: true },
  { id: 'u-purchasing', name: 'Neha Verma', email: 'purchasing@demo.io', role: 'PURCHASING', active: true },
  { id: 'u-accountant', name: 'Kavya Iyer', email: 'accountant@demo.io', role: 'ACCOUNTANT', active: true },
  { id: 'u-6', name: 'Dev Patel', email: 'dev.patel@demo.io', role: 'WAREHOUSE_STAFF', active: false },
]

/* ------------------------------- categories ------------------------------ */

export const categories: Category[] = [
  { id: 'c-bracelets', name: 'Bracelets', description: 'Handcrafted bracelets and bangles', productCount: 9 },
  { id: 'c-necklaces', name: 'Necklaces', description: 'Pendants, chains and chokers', productCount: 8 },
  { id: 'c-accessories', name: 'Accessories', description: 'Rings, earrings, hair accessories', productCount: 8 },
  { id: 'c-home', name: 'Home Decoration', description: 'Candles, vases, wall decor', productCount: 6 },
]

/* -------------------------------- products ------------------------------- */

interface ProductSeed {
  sku: string
  name: string
  categoryId: string
  sellingPrice: number
  costPrice: number
  stock: number
}

const productSeeds: ProductSeed[] = [
  { sku: 'BR-PEARL-001', name: 'Pearl Bracelet', categoryId: 'c-bracelets', sellingPrice: 899, costPrice: 270, stock: 42 },
  { sku: 'BR-GOLD-002', name: 'Gold-Tone Chain Bracelet', categoryId: 'c-bracelets', sellingPrice: 1299, costPrice: 480, stock: 28 },
  { sku: 'BR-BEAD-003', name: 'Amethyst Bead Bracelet', categoryId: 'c-bracelets', sellingPrice: 749, costPrice: 225, stock: 6 },
  { sku: 'BR-CHARM-004', name: 'Heart Charm Bracelet', categoryId: 'c-bracelets', sellingPrice: 999, costPrice: 340, stock: 51 },
  { sku: 'BR-SILV-005', name: 'Sterling Silver Cuff', categoryId: 'c-bracelets', sellingPrice: 2499, costPrice: 990, stock: 14 },
  { sku: 'BR-ROPE-006', name: 'Rope Knot Friendship Bracelet', categoryId: 'c-bracelets', sellingPrice: 399, costPrice: 110, stock: 0 },
  { sku: 'BR-TURQ-007', name: 'Turquoise Stone Bracelet', categoryId: 'c-bracelets', sellingPrice: 849, costPrice: 290, stock: 33 },
  { sku: 'BR-BANG-008', name: 'Meenakari Bangles (Set of 4)', categoryId: 'c-bracelets', sellingPrice: 1599, costPrice: 610, stock: 9 },
  { sku: 'BR-LEAT-009', name: 'Leather Wrap Bracelet', categoryId: 'c-bracelets', sellingPrice: 599, costPrice: 180, stock: 47 },
  { sku: 'NK-PEND-001', name: 'Lotus Pendant Necklace', categoryId: 'c-necklaces', sellingPrice: 1499, costPrice: 520, stock: 22 },
  { sku: 'NK-PEARL-002', name: 'Freshwater Pearl Strand', categoryId: 'c-necklaces', sellingPrice: 2999, costPrice: 1180, stock: 11 },
  { sku: 'NK-CHOK-003', name: 'Velvet Ribbon Choker', categoryId: 'c-necklaces', sellingPrice: 649, costPrice: 190, stock: 38 },
  { sku: 'NK-LAYR-004', name: 'Layered Gold Chain Set', categoryId: 'c-necklaces', sellingPrice: 1899, costPrice: 700, stock: 17 },
  { sku: 'NK-LOCK-005', name: 'Initial Locket Necklace', categoryId: 'c-necklaces', sellingPrice: 1199, costPrice: 430, stock: 4 },
  { sku: 'NK-BEAD-006', name: 'Ruby Bead Necklace', categoryId: 'c-necklaces', sellingPrice: 2199, costPrice: 840, stock: 26 },
  { sku: 'NK-ANKL-007', name: 'Silver Payal Anklet', categoryId: 'c-necklaces', sellingPrice: 799, costPrice: 260, stock: 44 },
  { sku: 'NK-STMT-008', name: 'Oxidised Statement Necklace', categoryId: 'c-necklaces', sellingPrice: 1349, costPrice: 490, stock: 19 },
  { sku: 'AC-RING-001', name: 'Stackable Midi Rings (Set of 3)', categoryId: 'c-accessories', sellingPrice: 549, costPrice: 160, stock: 63 },
  { sku: 'AC-EARR-002', name: 'Jhumka Earrings', categoryId: 'c-accessories', sellingPrice: 899, costPrice: 310, stock: 37 },
  { sku: 'AC-HAIR-003', name: 'Pearl Hair Pins (Set of 6)', categoryId: 'c-accessories', sellingPrice: 449, costPrice: 130, stock: 5 },
  { sku: 'AC-WATCH-004', name: 'Minimalist Dial Watch', categoryId: 'c-accessories', sellingPrice: 3499, costPrice: 1450, stock: 12 },
  { sku: 'AC-SCRN-005', name: 'Silk Scarf — Floral', categoryId: 'c-accessories', sellingPrice: 999, costPrice: 350, stock: 29 },
  { sku: 'AC-TOTE-006', name: 'Jute Tote Bag', categoryId: 'c-accessories', sellingPrice: 699, costPrice: 220, stock: 41 },
  { sku: 'AC-KEYC-007', name: 'Brass Keychain', categoryId: 'c-accessories', sellingPrice: 299, costPrice: 80, stock: 88 },
  { sku: 'AC-SUNG-008', name: 'Cat-Eye Sunglasses', categoryId: 'c-accessories', sellingPrice: 1299, costPrice: 470, stock: 16 },
  { sku: 'HD-CAND-001', name: 'Soy Wax Scented Candle', categoryId: 'c-home', sellingPrice: 599, costPrice: 190, stock: 72 },
  { sku: 'HD-VASE-002', name: 'Ceramic Terracotta Vase', categoryId: 'c-home', sellingPrice: 1099, costPrice: 400, stock: 3 },
  { sku: 'HD-WALL-003', name: 'Macrame Wall Hanging', categoryId: 'c-home', sellingPrice: 1399, costPrice: 510, stock: 21 },
  { sku: 'HD-TABLE-004', name: 'Marble Coaster Set', categoryId: 'c-home', sellingPrice: 899, costPrice: 330, stock: 34 },
  { sku: 'HD-MIRR-005', name: 'Round Wall Mirror', categoryId: 'c-home', sellingPrice: 2499, costPrice: 980, stock: 8 },
  { sku: 'HD-LAMP-006', name: 'Rattan Table Lamp', categoryId: 'c-home', sellingPrice: 1999, costPrice: 760, stock: 13 },
]

export const products: Product[] = productSeeds.map((s, i) => ({
  id: `p-${String(i + 1).padStart(3, '0')}`,
  sku: s.sku,
  name: s.name,
  categoryId: s.categoryId,
  category: categories.find((c) => c.id === s.categoryId)?.name ?? 'Uncategorised',
  description: `${s.name} — handcrafted and quality-checked before dispatch.`,
  sellingPrice: s.sellingPrice,
  costPrice: s.costPrice,
  taxRate: 3.0,
  weightGrams: between(20, 900),
  barcode: `890${String(1000000000 + i * 7919).slice(0, 10)}`,
  stock: s.stock,
  availableStock: Math.max(0, s.stock - between(0, 4) - (s.stock > 5 ? 2 : 0)),
  minimumStock: 10,
  status: i === 5 ? 'INACTIVE' : 'ACTIVE',
  createdAt: daysAgo(200 - i * 4),
  variants:
    i % 7 === 0
      ? [
          { id: uid('v'), sku: `${s.sku}-S`, name: 'Small', attributes: { size: 'S' }, price: s.sellingPrice, stock: between(2, 20), status: 'ACTIVE' },
          { id: uid('v'), sku: `${s.sku}-M`, name: 'Medium', attributes: { size: 'M' }, price: s.sellingPrice, stock: between(2, 20), status: 'ACTIVE' },
        ]
      : undefined,
}))

export const lowStockProducts = (): Product[] =>
  products.filter((p) => p.status === 'ACTIVE' && p.availableStock <= p.minimumStock)

/* -------------------------------- inventory ------------------------------- */

export const inventory: InventoryItem[] = products.map((p) => {
  const reserved = Math.min(p.stock, between(0, 6))
  const damaged = between(0, 3)
  const incoming = rnd() > 0.7 ? between(10, 80) : 0
  return {
    productId: p.id,
    sku: p.sku,
    name: p.name,
    warehouseId: 'w-1',
    warehouseName: 'Delhi Fulfillment Center',
    binCode: `A${between(1, 3)}-S0${between(1, 6)}-B0${between(1, 8)}`,
    physicalStock: p.stock,
    reservedStock: reserved,
    availableStock: Math.max(0, p.availableStock),
    damagedStock: damaged,
    incomingStock: incoming,
    minimumStock: p.minimumStock,
  }
})

export const movements: InventoryMovement[] = inventory.slice(0, 12).flatMap((item) =>
  Array.from({ length: 4 }, (_, k) => ({
    id: uid('mv'),
    productId: item.productId,
    type: pick(['SALE', 'ADJUSTMENT', 'PURCHASE_RECEIPT', 'RESERVATION', 'RETURN_RESTOCK'] as const),
    quantity: between(-4, 40),
    fromBin: k % 2 === 0 ? item.binCode : undefined,
    toBin: item.binCode,
    reason: pick(['Damaged in transit', 'Cycle count correction', 'Order fulfilment', 'Restock']),
    note: undefined,
    createdBy: pick(['Ravi Kumar', 'Dev Patel', 'System']),
    createdAt: daysAgo(between(1, 30)),
  })),
).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/* ------------------------------- warehouses ------------------------------- */

export const warehouses: Warehouse[] = [
  { id: 'w-1', code: 'WH-DEL-01', name: 'Delhi Fulfillment Center', address: 'Plot 14, Okhla Industrial Area Phase 2', city: 'New Delhi', active: true, zoneCount: 3, binCount: 144 },
  { id: 'w-2', code: 'WH-MUM-01', name: 'Mumbai Storage Hub', address: 'Unit 7, Andheri East MIDC', city: 'Mumbai', active: true, zoneCount: 2, binCount: 72 },
]

export const zones: Zone[] = [
  { id: 'z-a1', warehouseId: 'w-1', code: 'A', name: 'Zone A — Small Items', description: 'Jewellery and small accessories' },
  { id: 'z-b1', warehouseId: 'w-1', code: 'B', name: 'Zone B — Bulk', description: 'Home decoration bulk stock' },
  { id: 'z-c1', warehouseId: 'w-1', code: 'C', name: 'Zone C — Returns', description: 'Return inspection and quarantine' },
  { id: 'z-a2', warehouseId: 'w-2', code: 'A', name: 'Zone A — General', description: undefined },
]

export const racks: Rack[] = [
  { id: 'r-a1', warehouseId: 'w-1', zoneId: 'z-a1', code: 'A1' },
  { id: 'r-a2', warehouseId: 'w-1', zoneId: 'z-a1', code: 'A2' },
  { id: 'r-b1', warehouseId: 'w-1', zoneId: 'z-b1', code: 'B1' },
  { id: 'r-c1', warehouseId: 'w-1', zoneId: 'z-c1', code: 'C1' },
  { id: 'r-a3', warehouseId: 'w-2', zoneId: 'z-a2', code: 'A1' },
]

export const shelves: Shelf[] = racks.flatMap((r) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `s-${r.id}-${i + 1}`,
    warehouseId: r.warehouseId,
    rackId: r.id,
    code: `${r.code}-S0${i + 1}`,
  })),
)

export const bins: Bin[] = shelves.flatMap((shelf) =>
  Array.from({ length: 4 }, (_, i) => {
    const capacity = between(80, 200)
    const occupied = between(0, capacity)
    return {
      id: `b-${shelf.id}-${i + 1}`,
      code: `${shelf.code}-B0${i + 1}`,
      warehouseId: shelf.warehouseId,
      rackId: shelf.rackId,
      shelfId: shelf.id,
      capacity,
      occupied,
      availableCapacity: capacity - occupied,
      active: true,
    }
  }),
)

/* ------------------------------- customers -------------------------------- */

const customerSeeds = [
  ['Ananya Rao', 'ananya.rao@example.com', 'VIP'],
  ['Rahul Sharma', 'rahul@example.com', 'REPEAT'],
  ['Meera Nair', 'meera.nair@example.com', 'VIP'],
  ['Vikram Singh', 'vikram.singh@example.com', 'REPEAT'],
  ['Ishita Bose', 'ishita.bose@example.com', 'NEW'],
  ['Karan Malhotra', 'karan.m@example.com', 'REPEAT'],
  ['Divya Pillai', 'divya.p@example.com', 'NEW'],
  ['Aditya Chopra', 'aditya.c@example.com', 'VIP'],
  ['Sneha Reddy', 'sneha.reddy@example.com', 'REPEAT'],
  ['Rohan Joshi', 'rohan.joshi@example.com', 'NEW'],
  ['Tanvi Desai', 'tanvi.desai@example.com', 'REPEAT'],
  ['Nikhil Menon', 'nikhil.menon@example.com', 'NEW'],
] as const

export const customers: Customer[] = customerSeeds.map(([name, email, segment], i) => {
  const totalOrders = segment === 'VIP' ? between(6, 12) : segment === 'REPEAT' ? between(2, 5) : 1
  const totalSpent = totalOrders * between(900, 3200)
  return {
    id: `cu-${String(i + 1).padStart(3, '0')}`,
    name,
    email,
    phone: `+91 9${between(100000000, 899999999)}`,
    segment: segment as Customer['segment'],
    totalOrders,
    totalSpent,
    createdAt: daysAgo(between(30, 600)),
    addresses: [
      {
        line1: `${between(1, 99)}, ${pick(['Rose Villa', 'Palm Residency', 'Green Enclave', 'Lake View Apartments'])}`,
        city: pick(['Mumbai', 'New Delhi', 'Bengaluru', 'Pune', 'Chennai']),
        state: pick(['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu']),
        postalCode: String(between(110001, 600100)),
        country: 'India',
      },
    ],
  }
})

/* --------------------------------- orders ---------------------------------- */

const statusSequence: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PICKING', 'PICKING', 'PICKED', 'PACKING', 'PACKING',
  'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'SHIPPED', 'DELIVERED', 'DELIVERED',
  'DELIVERED', 'CANCELLED', 'RETURNED', 'PENDING', 'CONFIRMED', 'PICKED',
  'SHIPPED', 'DELIVERED', 'CONFIRMED', 'PICKING', 'PACKED',
]

export const orders: Order[] = statusSequence.map((status, i) => {
  const customer = customers[i % customers.length]
  const itemCount = between(1, 4)
  const items = Array.from({ length: itemCount }, (_, k) => {
    const p = products[(i * 3 + k * 7) % products.length]
    const quantity = between(1, 3)
    return {
      id: `oi-${i}-${k}`,
      productId: p.id,
      sku: p.sku,
      name: p.name,
      quantity,
      unitPrice: p.sellingPrice,
      lineTotal: quantity * p.sellingPrice,
    }
  })
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0)
  const shippingFee = subtotal > 1500 ? 0 : 79
  const discount = rnd() > 0.7 ? Math.round(subtotal * 0.1) : 0
  const tax = Math.round(subtotal * 0.03)
  return {
    id: `o-${String(i + 1).padStart(3, '0')}`,
    orderNumber: `#10${452 + i}`,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    status,
    itemCount,
    channel: 'SHOPIFY' as const,
    createdAt: daysAgo(between(0, 12)),
    items,
    shippingAddress: customer.addresses[0],
    payment: {
      method: pick(['UPI', 'Credit Card', 'Cash on Delivery', 'Net Banking']),
      status: status === 'CANCELLED' ? 'REFUNDED' : 'PAID',
      transactionId: `txn_${between(100000, 999999)}`,
      paidAt: daysAgo(between(0, 12)),
    },
    subtotal,
    shippingFee,
    discount,
    tax,
    total: subtotal + shippingFee + tax - discount,
    shippingMethod: pick(['Standard', 'Express']),
    trackingNumber: ['SHIPPED', 'DELIVERED'].includes(status) ? `BL${between(10000000, 99999999)}` : undefined,
    cancelledAt: status === 'CANCELLED' ? daysAgo(between(0, 5)) : undefined,
    cancellationReason: status === 'CANCELLED' ? 'Customer requested cancellation' : undefined,
  }
})

export const orderSummaries = (): OrderSummary[] =>
  orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    status: o.status,
    itemCount: o.itemCount,
    total: o.total,
    channel: o.channel,
    createdAt: o.createdAt,
  }))

/* -------------------------------- picking ---------------------------------- */

export const pickLists = new Map<string, PickList>()

export const inventoryDetails = new Map<string, InventoryDetail>()
for (const item of inventory) {
  inventoryDetails.set(item.productId, {
    ...item,
    reservations:
      item.reservedStock > 0
        ? orders
            .filter((o) => ['PENDING', 'CONFIRMED', 'PICKING'].includes(o.status))
            .slice(0, 2)
            .map((o) => ({
              id: uid('res'),
              orderId: o.id,
              orderNumber: o.orderNumber,
              quantity: between(1, 3),
              createdAt: daysAgo(between(0, 3)),
            }))
        : [],
  })
}

export function ensurePickList(orderId: string): PickList {
  const existing = [...pickLists.values()].find((pl) => pl.orderId === orderId)
  if (existing) return existing
  const order = orders.find((o) => o.id === orderId)
  if (!order) throw new Error('RESOURCE_NOT_FOUND')
  const pl: PickList = {
    pickListId: uid('pl'),
    orderId,
    orderNumber: order.orderNumber,
    assignedPicker: pick(['Ravi Kumar', 'Dev Patel']),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    items: order.items.map((it, idx) => ({
      itemId: `pi-${plIdSeq(idx, orderId)}-${idx}`,
      productId: it.productId,
      sku: it.sku,
      name: it.name,
      quantity: it.quantity,
      pickedQuantity: 0,
      location: inventory.find((inv) => inv.productId === it.productId)?.binCode ?? 'A1-S01-B01',
      picked: false,
    })),
  }
  pickLists.set(pl.pickListId, pl)
  return pl
}

function plIdSeq(_idx: number, orderId: string): string {
  return orderId.replace(/[^a-z0-9]/gi, '')
}

// Pre-generate pick lists for orders currently in PICKING
orders.filter((o) => o.status === 'PICKING').forEach((o) => ensurePickList(o.id))

/* -------------------------------- packing ---------------------------------- */

export const packingTasks = new Map<string, PackingTask>()

orders
  .filter((o) => o.status === 'PACKING')
  .forEach((o) => {
    const task: PackingTask = {
      packingId: uid('pk'),
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: 'OPEN',
      createdAt: daysAgo(0),
      items: o.items.map((it) => ({
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        verified: false,
      })),
    }
    packingTasks.set(task.packingId, task)
  })

/* -------------------------------- suppliers -------------------------------- */

export const suppliers: Supplier[] = [
  { id: 'sup-1', name: 'ABC Accessories Pvt Ltd', contactPerson: 'Amit Gupta', email: 'amit@abcaccessories.in', phone: '+91 9820011223', leadTimeDays: 5, paymentTerms: 'NET_30', status: 'ACTIVE', address: 'Karol Bagh, New Delhi' },
  { id: 'sup-2', name: 'Jaipur Gems & Beads', contactPerson: 'Sunita Jain', email: 'sunita@jaipurgems.in', phone: '+91 9414088776', leadTimeDays: 8, paymentTerms: 'NET_45', status: 'ACTIVE', address: 'Johari Bazaar, Jaipur' },
  { id: 'sup-3', name: 'DecoHome Imports', contactPerson: 'Farhan Ali', email: 'farhan@decohome.com', phone: '+91 9900112233', leadTimeDays: 12, paymentTerms: 'PREPAID', status: 'ACTIVE', address: 'Bhiwandi, Mumbai' },
  { id: 'sup-4', name: 'Silk Route Textiles', contactPerson: 'Lakshmi Menon', email: 'lakshmi@silkroute.in', phone: '+91 9440077889', leadTimeDays: 7, paymentTerms: 'NET_15', status: 'ACTIVE', address: 'Kanchipuram, Tamil Nadu' },
  { id: 'sup-5', name: 'Metro Packaging Co', contactPerson: 'Harpreet Singh', email: 'harpreet@metropack.in', phone: '+91 9811044556', leadTimeDays: 3, paymentTerms: 'NET_15', status: 'INACTIVE', address: 'Ludhiana, Punjab' },
]

/* ----------------------------- purchase orders ----------------------------- */

function makePO(
  i: number,
  supplierId: string,
  status: PurchaseOrder['status'],
  daysBack: number,
): PurchaseOrder {
  const supplier = suppliers.find((s) => s.id === supplierId)!
  const poItems = Array.from({ length: between(1, 3) }, (_, k) => {
    const p = products[(i * 5 + k * 9) % products.length]
    const quantity = between(20, 80)
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      quantity,
      unitCost: p.costPrice,
      lineTotal: quantity * p.costPrice,
      receivedQuantity: status === 'RECEIVED' ? quantity : status === 'PARTIALLY_RECEIVED' ? Math.floor(quantity * 0.6) : 0,
      damagedQuantity: status === 'RECEIVED' ? between(0, 2) : 0,
    }
  })
  const history: PurchaseOrder['statusHistory'] = [{ status: 'DRAFT', changedBy: 'Neha Verma', changedAt: daysAgo(daysBack) }]
  const chain: PurchaseOrder['status'][] = ['SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED']
  const upto = chain.indexOf(status)
  if (status === 'CANCELLED') history.push({ status: 'CANCELLED', changedBy: 'Arjun Mehta', changedAt: daysAgo(daysBack - 1) })
  else chain.slice(0, upto + 1).forEach((st, idx) => history.push({ status: st, changedBy: idx === 0 ? 'Neha Verma' : 'Priya Sharma', changedAt: daysAgo(Math.max(0, daysBack - 1 - idx)) }))
  return {
    id: `po-${String(i + 1).padStart(3, '0')}`,
    poNumber: `PO-2026-${String(101 + i)}`,
    supplierId,
    supplierName: supplier.name,
    warehouseId: 'w-1',
    status,
    items: poItems,
    total: poItems.reduce((sum, it) => sum + it.lineTotal, 0),
    expectedDeliveryDate: daysAgo(daysBack - 10),
    createdAt: daysAgo(daysBack),
    statusHistory: history,
  }
}

import type { PurchaseOrder as POType } from '@/types/api'
const poStatuses: POType['status'][] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'RECEIVED']
export const purchaseOrders: PurchaseOrder[] = poStatuses.map((st, i) =>
  makePO(i, suppliers[i % 4].id, st, 14 - i * 2),
)

/* --------------------------------- returns --------------------------------- */

export const returns: ReturnRequest[] = [
  { id: 'ret-1', returnNumber: 'RET-2026-011', orderId: 'o-016', orderNumber: '#10,467', customerName: customers[15 % 12].name, status: 'REQUESTED', reason: 'DAMAGED', items: [{ orderItemId: 'oi-15-0', productId: 'p-4', sku: 'BR-CHARM-004', name: 'Heart Charm Bracelet', quantity: 1 }], refundAmount: 999, createdAt: daysAgo(2) },
  { id: 'ret-2', returnNumber: 'RET-2026-010', orderId: 'o-011', orderNumber: '#10,462', customerName: customers[10 % 12].name, status: 'APPROVED', reason: 'WRONG_ITEM', items: [{ orderItemId: 'oi-10-0', productId: 'p-19', sku: 'AC-EARR-002', name: 'Jhumka Earrings', quantity: 1 }], refundAmount: 899, createdAt: daysAgo(4) },
  { id: 'ret-3', returnNumber: 'RET-2026-009', orderId: 'o-008', orderNumber: '#10,459', customerName: customers[7 % 12].name, status: 'INSPECTED', reason: 'NOT_AS_DESCRIBED', items: [{ orderItemId: 'oi-7-0', productId: 'p-27', sku: 'HD-VASE-002', name: 'Ceramic Terracotta Vase', quantity: 1 }], refundAmount: 1099, inspection: { condition: 'GOOD', restockable: true, notes: 'Packaging damaged, product intact' }, createdAt: daysAgo(6) },
  { id: 'ret-4', returnNumber: 'RET-2026-008', orderId: 'o-013', orderNumber: '#10,464', customerName: customers[12 % 12].name, status: 'RESOLVED', reason: 'QUALITY', items: [{ orderItemId: 'oi-12-1', productId: 'p-10', sku: 'NK-PEND-001', name: 'Lotus Pendant Necklace', quantity: 1 }], refundAmount: 1499, inspection: { condition: 'DAMAGED', restockable: false, notes: 'Broken clasp' }, resolution: 'REFUND', createdAt: daysAgo(9) },
  { id: 'ret-5', returnNumber: 'RET-2026-007', orderId: 'o-005', orderNumber: '#10,456', customerName: customers[4 % 12].name, status: 'RESOLVED', reason: 'CUSTOMER_CHANGED_MIND', items: [{ orderItemId: 'oi-4-0', productId: 'p-26', sku: 'HD-CAND-001', name: 'Soy Wax Scented Candle', quantity: 2 }], refundAmount: 1198, inspection: { condition: 'GOOD', restockable: true }, resolution: 'REFUND', createdAt: daysAgo(11) },
  { id: 'ret-6', returnNumber: 'RET-2026-006', orderId: 'o-002', orderNumber: '#10,453', customerName: customers[1 % 12].name, status: 'REQUESTED', reason: 'DAMAGED', items: [{ orderItemId: 'oi-1-1', productId: 'p-14', sku: 'NK-LOCK-005', name: 'Initial Locket Necklace', quantity: 1 }], refundAmount: 1199, createdAt: daysAgo(1) },
]

/* ------------------------------ notifications ------------------------------ */

export const notifications: AppNotification[] = [
  { id: 'n-1', type: 'LOW_STOCK', title: 'Low stock alert', message: 'Amethyst Bead Bracelet (BR-BEAD-003) has 6 units left', read: false, createdAt: daysAgo(0), link: '/inventory' },
  { id: 'n-2', type: 'NEW_ORDER', title: 'New Shopify order', message: 'Order #10,475 received — ₹2,398', read: false, createdAt: daysAgo(0), link: '/orders' },
  { id: 'n-3', type: 'PURCHASE_ORDER_UPDATE', title: 'Purchase order approved', message: 'PO-2026-104 approved by Priya Sharma', read: false, createdAt: daysAgo(1), link: '/purchase-orders' },
  { id: 'n-4', type: 'RETURN_REQUEST', title: 'Return requested', message: 'RET-2026-011 — Damaged item (Heart Charm Bracelet)', read: false, createdAt: daysAgo(2), link: '/returns' },
  { id: 'n-5', type: 'DELAYED_ORDER', title: 'Order delayed', message: 'Order #10,461 has been in PICKING for more than 24 hours', read: true, createdAt: daysAgo(2), link: '/orders' },
  { id: 'n-6', type: 'LOW_STOCK', title: 'Out of stock', message: 'Rope Knot Friendship Bracelet (BR-ROPE-006) is out of stock', read: true, createdAt: daysAgo(3), link: '/inventory' },
  { id: 'n-7', type: 'SYSTEM', title: 'Shopify sync completed', message: 'Full sync finished — 842 products, 127 orders processed', read: true, createdAt: daysAgo(4), link: '/shopify' },
  { id: 'n-8', type: 'NEW_ORDER', title: 'New Shopify order', message: 'Order #10,474 received — ₹899', read: true, createdAt: daysAgo(5), link: '/orders' },
]

/* -------------------------------- users audit ------------------------------ */

export const auditLogs: AuditLog[] = Array.from({ length: 18 }, (_, i) => {
  const user = users[i % users.length]
  const action = pick(['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN'] as const)
  const entityType = pick(['PRODUCT', 'ORDER', 'INVENTORY', 'PURCHASE_ORDER', 'USER', 'RETURN'])
  return {
    id: `al-${i + 1}`,
    userId: user.id,
    userName: user.name,
    entityType,
    entityId: uid(entityType.toLowerCase()),
    action,
    summary: `${action} on ${entityType} ${uid('x')}`,
    createdAt: daysAgo(between(0, 14)),
  }
}).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/* --------------------------------- shopify --------------------------------- */

export const shopifyIntegration: ShopifyIntegration = {
  connected: true,
  shopDomain: 'luna-charms.myshopify.com',
  storeName: 'Luna Charms',
  scopes: ['read_products', 'write_inventory', 'read_orders', 'read_customers'],
  connectedAt: daysAgo(120),
  sync: {
    products: { status: 'IDLE', lastSyncAt: daysAgo(0) },
    orders: { status: 'IDLE', lastSyncAt: daysAgo(0) },
    inventory: { status: 'FAILED', lastSyncAt: daysAgo(1), lastError: 'Shopify API rate limit exceeded (INTEGRATION_ERROR)' },
    customers: { status: 'IDLE', lastSyncAt: daysAgo(1) },
  },
}

export const syncLogs: SyncLog[] = [
  { id: 'sl-1', type: 'ORDERS', status: 'SUCCESS', message: 'Imported 12 new orders', recordsProcessed: 12, createdAt: daysAgo(0) },
  { id: 'sl-2', type: 'PRODUCTS', status: 'SUCCESS', message: 'Product catalog sync completed', recordsProcessed: 842, createdAt: daysAgo(0) },
  { id: 'sl-3', type: 'INVENTORY', status: 'FAILED', message: 'Rate limit exceeded while updating inventory levels', recordsProcessed: 210, createdAt: daysAgo(1) },
  { id: 'sl-4', type: 'CUSTOMERS', status: 'SUCCESS', message: 'Customer sync completed', recordsProcessed: 1934, createdAt: daysAgo(1) },
  { id: 'sl-5', type: 'FULL', status: 'SUCCESS', message: 'Nightly full sync completed', recordsProcessed: 2815, createdAt: daysAgo(2) },
]

/* -------------------------------- dashboard --------------------------------- */

export const dashboardSummary: DashboardSummary = {
  sales: { gross: 1842300.0, net: 1765300.0, growthPercent: 15.8 },
  orders: { total: 127, pending: 12, processing: 18, packed: 23, shipped: 41, delivered: 33 },
  inventory: { totalSkus: 842, lowStockSkus: 18, outOfStockSkus: 4, inventoryValue: 2485000.0 },
  profit: { estimated: 954300.0, marginPercent: 54.1 },
  returns: { count: 7, ratePercent: 2.4 },
}

export function buildSalesChart(days: number): SalesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const base = 45000 + (i % 7 === 5 || i % 7 === 6 ? 30000 : 0) + i * 1500
    return {
      date: d.toISOString().slice(0, 10),
      sales: Math.round(base + rnd() * 20000),
      orders: between(12, 34),
    }
  })
}

export const topProducts = (): TopProduct[] =>
  [...products]
    .slice(0, 10)
    .map((p, i) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitsSold: between(30, 160) - i * 8,
      revenue: between(30, 160) * p.sellingPrice,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)

export const lowStock = (): LowStockItem[] =>
  lowStockProducts().map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    availableStock: p.availableStock,
    minimumStock: p.minimumStock,
    warehouse: 'Delhi Fulfillment Center',
  }))

export const alerts = (): DashboardAlert[] => [
  { id: 'a-1', type: 'OUT_OF_STOCK', severity: 'CRITICAL', message: 'BR-ROPE-006 (Rope Knot Friendship Bracelet) is out of stock with 3 open orders', createdAt: daysAgo(0) },
  { id: 'a-2', type: 'LOW_STOCK', severity: 'WARNING', message: '18 SKUs are below minimum stock levels', createdAt: daysAgo(0) },
  { id: 'a-3', type: 'DELAYED_ORDER', severity: 'WARNING', message: '2 orders have been in picking for more than 24 hours', createdAt: daysAgo(1) },
  { id: 'a-4', type: 'PURCHASE_ORDER', severity: 'INFO', message: 'PO-2026-103 is awaiting approval', createdAt: daysAgo(1) },
  { id: 'a-5', type: 'RETURN_REQUEST', severity: 'INFO', message: '2 return requests awaiting review', createdAt: daysAgo(2) },
]

export const bestSellers = (): BestSeller[] => topProducts()

export const deadStock = (): DeadStockItem[] =>
  products.slice(18, 24).map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    stock: p.stock,
    stockValue: p.stock * p.costPrice,
    lastSoldAt: daysAgo(between(70, 180)),
    daysSinceLastSale: between(70, 180),
  }))
