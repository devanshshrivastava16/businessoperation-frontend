/**
 * Mock adapter — intercepts Axios at the transport level when
 * VITE_USE_MOCKS === 'true' and serves responses from the in-memory
 * mock database, honouring the paths, methods, pagination and error
 * shapes of the API contract.
 *
 * This is the ONLY module that imports mocks/db.ts. Remove the env flag
 * (or set it to false) and this file never loads.
 */

import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosError as AxiosErrorType,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiErrorBody, OrderStatus, Page } from '@/types/api'
import * as db from './db'

type Handler = (
  match: RegExpMatchArray,
  ctx: { body: Record<string, unknown>; query: URLSearchParams; config: InternalAxiosRequestConfig },
) => { status?: number; data?: unknown } | unknown

const routes: [string, RegExp, Handler][] = [
  /* -------------------------------- auth -------------------------------- */
  ['POST', /^\/auth\/login$/, (_m, { body }) => mockLogin(String(body.email ?? ''), String(body.password ?? ''))],
  ['POST', /^\/auth\/register$/, (_m, { body }) => mockRegister(String(body.name ?? ''), String(body.email ?? ''))],
  ['POST', /^\/auth\/refresh$/, (_m, { body }) => mockRefresh(String(body.refreshToken ?? ''))],
  ['POST', /^\/auth\/logout$/, () => ({ status: 204, data: undefined })],
  ['GET', /^\/auth\/me$/, (_m, { config }) => userFromToken(config) ?? error(401, 'UNAUTHORIZED', 'Session invalid')],

  /* ------------------------------ dashboard ------------------------------ */
  ['GET', /^\/dashboard\/summary$/, () => db.dashboardSummary],
  ['GET', /^\/dashboard\/sales$/, (_m, { query }) => {
    const from = query.get('from')
    const to = query.get('to')
    let points = db.buildSalesChart(14)
    if (from) points = points.filter((p) => p.date >= from)
    if (to) points = points.filter((p) => p.date <= to)
    return { data: points }
  }],
  ['GET', /^\/dashboard\/top-products$/, () => ({ data: db.topProducts() })],
  ['GET', /^\/dashboard\/low-stock$/, () => ({ data: db.lowStock() })],
  ['GET', /^\/dashboard\/alerts$/, () => ({ data: db.alerts() })],

  /* ------------------------------ products ------------------------------- */
  ['GET', /^\/products$/, (_m, { query }) => pageOf(db.products, query)],
  ['GET', /^\/products\/([^/]+)\/locations$/, (m) => ({
    data: db.inventory
      .filter((i) => i.productId === m[1])
      .map((i) => ({ id: `loc-${i.productId}`, binCode: i.binCode, warehouseName: i.warehouseName, quantity: i.physicalStock })),
  })],
  ['POST', /^\/products\/([^/]+)\/locations$/, () => ({ status: 201, data: undefined })],
  ['GET', /^\/products\/([^/]+)$/, (m) => db.products.find((p) => p.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Product not found')],
  ['POST', /^\/products$/, (_m, { body }) => {
    const category = db.categories.find((c) => c.id === body.categoryId)
    const product = {
      id: db.uid('p'),
      sku: String(body.sku ?? ''),
      name: String(body.name ?? ''),
      categoryId: String(body.categoryId ?? ''),
      category: category?.name ?? 'Uncategorised',
      description: body.description as string | undefined,
      sellingPrice: Number(body.sellingPrice ?? 0),
      costPrice: Number(body.costPrice ?? 0),
      taxRate: Number(body.taxRate ?? 3),
      weightGrams: body.weightGrams as number | undefined,
      barcode: body.barcode as string | undefined,
      supplierId: body.supplierId as string | undefined,
      stock: 0,
      availableStock: 0,
      minimumStock: Number(body.minimumStock ?? 10),
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
    }
    db.products.unshift(product)
    return { status: 201, data: product }
  }],
  ['PUT', /^\/products\/([^/]+)$/, (m, { body }) => {
    const p = db.products.find((x) => x.id === m[1])
    if (!p) return error(404, 'RESOURCE_NOT_FOUND', 'Product not found')
    const category = db.categories.find((c) => c.id === body.categoryId)
    Object.assign(p, {
      ...body,
      category: category?.name ?? p.category,
      sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : p.sellingPrice,
      costPrice: body.costPrice !== undefined ? Number(body.costPrice) : p.costPrice,
      minimumStock: body.minimumStock !== undefined ? Number(body.minimumStock) : p.minimumStock,
    })
    return p
  }],
  ['DELETE', /^\/products\/([^/]+)$/, (m) => {
    const p = db.products.find((x) => x.id === m[1])
    if (!p) return error(404, 'RESOURCE_NOT_FOUND', 'Product not found')
    p.status = 'INACTIVE'
    return { status: 204, data: undefined }
  }],

  /* ----------------------------- categories ------------------------------ */
  ['GET', /^\/categories$/, () => ({ data: db.categories })],
  ['POST', /^\/categories$/, (_m, { body }) => {
    const cat = { id: db.uid('c'), name: String(body.name ?? ''), description: body.description as string | undefined, productCount: 0 }
    if (db.categories.some((c) => c.name.toLowerCase() === cat.name.toLowerCase())) {
      return error(409, 'DUPLICATE_RESOURCE', `Category "${cat.name}" already exists`)
    }
    db.categories.push(cat)
    return { status: 201, data: cat }
  }],
  ['PUT', /^\/categories\/([^/]+)$/, (m, { body }) => {
    const cat = db.categories.find((c) => c.id === m[1])
    if (!cat) return error(404, 'RESOURCE_NOT_FOUND', 'Category not found')
    Object.assign(cat, body)
    return cat
  }],
  ['DELETE', /^\/categories\/([^/]+)$/, (m) => {
    const idx = db.categories.findIndex((c) => c.id === m[1])
    if (idx === -1) return error(404, 'RESOURCE_NOT_FOUND', 'Category not found')
    if (db.products.some((p) => p.categoryId === m[1])) {
      return error(409, 'BUSINESS_RULE_VIOLATION', 'Category still has products assigned')
    }
    db.categories.splice(idx, 1)
    return { status: 204, data: undefined }
  }],

  /* ------------------------------ inventory ------------------------------ */
  ['GET', /^\/inventory$/, (_m, { query }) => {
    let rows = [...db.inventory]
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((r) => `${r.sku} ${r.name}`.toLowerCase().includes(search))
    const wh = query.get('warehouseId')
    if (wh) rows = rows.filter((r) => r.warehouseId === wh)
    if (query.get('lowStock') === 'true') rows = rows.filter((r) => r.availableStock <= r.minimumStock && r.availableStock > 0)
    if (query.get('outOfStock') === 'true') rows = rows.filter((r) => r.availableStock === 0)
    return pageOf(rows, query)
  }],
  ['GET', /^\/inventory\/([^/]+)\/movements$/, (m, { query }) => {
    const rows = db.movements.filter((mv) => mv.productId === m[1])
    return pageOf(rows, query)
  }],
  ['GET', /^\/inventory\/([^/]+)$/, (m) =>
    db.inventoryDetails.get(m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Inventory not found')],
  ['POST', /^\/inventory\/([^/]+)\/adjust$/, (m, { body }) => {
    const inv = db.inventory.find((i) => i.productId === m[1])
    if (!inv) return error(404, 'RESOURCE_NOT_FOUND', 'Inventory not found')
    const qty = Number(body.quantity ?? 0)
    const nextPhysical = inv.physicalStock + qty
    if (nextPhysical < 0) return error(409, 'INSUFFICIENT_STOCK', 'Stock cannot become negative')
    inv.physicalStock = nextPhysical
    inv.availableStock = nextPhysical - inv.reservedStock - inv.damagedStock
    if (body.reason === 'DAMAGED') {
      inv.damagedStock += Math.abs(qty)
      inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.damagedStock)
    }
    const product = db.products.find((p) => p.id === inv.productId)
    if (product) {
      product.stock = inv.physicalStock
      product.availableStock = inv.availableStock
    }
    db.movements.unshift({
      id: db.uid('mv'),
      productId: inv.productId,
      type: 'ADJUSTMENT',
      quantity: qty,
      toBin: inv.binCode,
      reason: String(body.reason ?? 'ADJUSTMENT'),
      note: body.note as string | undefined,
      createdBy: 'Priya Sharma',
      createdAt: new Date().toISOString(),
    })
    const detail = db.inventoryDetails.get(inv.productId)
    if (detail) Object.assign(detail, inv)
    return { status: 200, data: inv }
  }],
  ['POST', /^\/inventory\/([^/]+)\/reserve$/, () => ({ status: 200, data: undefined })],
  ['POST', /^\/inventory\/([^/]+)\/release$/, () => ({ status: 200, data: undefined })],

  /* ------------------------------ warehouses ------------------------------ */
  ['GET', /^\/warehouses$/, () => ({ data: db.warehouses })],
  ['POST', /^\/warehouses$/, (_m, { body }) => {
    const wh = {
      id: db.uid('w'),
      code: String(body.code ?? ''),
      name: String(body.name ?? ''),
      address: String(body.address ?? ''),
      city: String(body.city ?? ''),
      active: body.active !== false,
      zoneCount: 0,
      binCount: 0,
    }
    db.warehouses.push(wh)
    return { status: 201, data: wh }
  }],
  ['GET', /^\/warehouses\/([^/]+)\/zones$/, (m) => ({ data: db.zones.filter((z) => z.warehouseId === m[1]) })],
  ['POST', /^\/warehouses\/([^/]+)\/zones$/, (m, { body }) => {
    const zone = { id: db.uid('z'), warehouseId: m[1], code: String(body.code ?? ''), name: String(body.name ?? ''), description: body.description as string | undefined }
    db.zones.push(zone)
    return { status: 201, data: zone }
  }],
  ['GET', /^\/warehouses\/([^/]+)\/racks$/, (m) => ({ data: db.racks.filter((r) => r.warehouseId === m[1]) })],
  ['POST', /^\/warehouses\/([^/]+)\/racks$/, (m, { body }) => {
    const rack = { id: db.uid('r'), warehouseId: m[1], zoneId: String(body.zoneId ?? ''), code: String(body.code ?? '') }
    db.racks.push(rack)
    return { status: 201, data: rack }
  }],
  ['GET', /^\/warehouses\/([^/]+)\/shelves$/, (m) => ({ data: db.shelves.filter((s) => s.warehouseId === m[1]) })],
  ['POST', /^\/warehouses\/([^/]+)\/shelves$/, (m, { body }) => {
    const shelf = { id: db.uid('s'), warehouseId: m[1], rackId: String(body.rackId ?? ''), code: String(body.code ?? '') }
    db.shelves.push(shelf)
    return { status: 201, data: shelf }
  }],
  ['GET', /^\/warehouses\/([^/]+)\/bins$/, (m, { query }) => {
    let rows = db.bins.filter((b) => b.warehouseId === m[1])
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((b) => b.code.toLowerCase().includes(search))
    return { data: rows }
  }],
  ['POST', /^\/warehouses\/([^/]+)\/bins$/, (m, { body }) => {
    const capacity = Number(body.capacity ?? 100)
    const bin = {
      id: db.uid('b'),
      code: String(body.code ?? ''),
      warehouseId: m[1],
      shelfId: body.shelfId as string | undefined,
      capacity,
      occupied: 0,
      availableCapacity: capacity,
      active: true,
    }
    db.bins.push(bin)
    return { status: 201, data: bin }
  }],
  ['PUT', /^\/bins\/([^/]+)$/, (m, { body }) => {
    const bin = db.bins.find((b) => b.id === m[1])
    if (!bin) return error(404, 'RESOURCE_NOT_FOUND', 'Bin not found')
    Object.assign(bin, body)
    return bin
  }],
  ['GET', /^\/warehouses\/([^/]+)$/, (m) => db.warehouses.find((w) => w.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Warehouse not found')],
  ['PUT', /^\/warehouses\/([^/]+)$/, (m, { body }) => {
    const wh = db.warehouses.find((w) => w.id === m[1])
    if (!wh) return error(404, 'RESOURCE_NOT_FOUND', 'Warehouse not found')
    Object.assign(wh, body)
    return wh
  }],

  /* -------------------------------- orders -------------------------------- */
  ['GET', /^\/orders$/, (_m, { query }) => {
    let rows = db.orderSummaries()
    const status = query.get('status')
    if (status) rows = rows.filter((r) => r.status === status)
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((r) => `${r.orderNumber} ${r.customerName} ${r.customerEmail}`.toLowerCase().includes(search.replace('#', '')))
    const from = query.get('from')
    if (from) rows = rows.filter((r) => r.createdAt.slice(0, 10) >= from)
    const to = query.get('to')
    if (to) rows = rows.filter((r) => r.createdAt.slice(0, 10) <= to)
    return pageOf(rows, query)
  }],
  ['GET', /^\/orders\/([^/]+)\/status-history$/, (m) => {
    const order = db.orders.find((o) => o.id === m[1])
    if (!order) return error(404, 'RESOURCE_NOT_FOUND', 'Order not found')
    return {
      data: [
        { id: 'h1', toStatus: 'PENDING', changedBy: 'Shopify Import', changedAt: order.createdAt, note: 'Order imported from Shopify' },
        { id: 'h2', fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: 'System', changedAt: order.createdAt, note: 'Payment confirmed' },
        ...((['PICKING', 'PICKED', 'PACKING', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as OrderStatus[])
          .slice(0, Math.max(0, (['PENDING', 'CONFIRMED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as OrderStatus[]).indexOf(order.status) - 1))
          .map((st: OrderStatus, idx) => ({
            id: `h${idx + 3}`,
            changedBy: idx % 2 === 0 ? 'Ravi Kumar' : 'Arjun Mehta',
            changedAt: db.orders.length > 0 ? new Date(new Date(order.createdAt).getTime() + (idx + 1) * 3600_000).toISOString() : undefined,
            toStatus: st,
          }))),
      ],
    }
  }],
  ['GET', /^\/orders\/([^/]+)$/, (m) => db.orders.find((o) => o.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Order not found')],
  ['PATCH', /^\/orders\/([^/]+)\/status$/, (m, { body }) => {
    const order = db.orders.find((o) => o.id === m[1])
    if (!order) return error(404, 'RESOURCE_NOT_FOUND', 'Order not found')
    const next = body.status as OrderStatus
    if (next === 'CANCELLED' && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return error(409, 'INVALID_STATE_TRANSITION', `Cannot cancel an order in ${order.status} state`)
    }
    if (next === 'PICKING' && order.status === 'PENDING') {
      return error(409, 'INVALID_STATE_TRANSITION', 'Order must be confirmed before picking starts')
    }
    order.status = next
    return { status: 200, data: undefined }
  }],

  /* ------------------------------- picking -------------------------------- */
  ['POST', /^\/orders\/([^/]+)\/pick-list$/, (m) => {
    try {
      const pl = db.ensurePickList(m[1])
      return { status: 201, data: pl }
    } catch {
      return error(404, 'RESOURCE_NOT_FOUND', 'Order not found')
    }
  }],
  ['POST', /^\/pick-lists\/([^/]+)\/items\/([^/]+)\/pick$/, (m, { body }) => {
    const pl = db.pickLists.get(m[1])
    if (!pl) return error(404, 'RESOURCE_NOT_FOUND', 'Pick list not found')
    const item = pl.items.find((it) => it.itemId === m[2])
    if (!item) return error(404, 'RESOURCE_NOT_FOUND', 'Pick list item not found')
    item.pickedQuantity = Number(body.pickedQuantity ?? item.quantity)
    item.picked = item.pickedQuantity >= item.quantity
    item.shortage = Boolean(body.shortage) || item.pickedQuantity < item.quantity
    if (body.shortage && item.pickedQuantity === 0) item.pickedQuantity = 0
    pl.status = pl.items.every((it) => it.picked || it.shortage) ? 'IN_PROGRESS' : pl.status === 'OPEN' ? 'IN_PROGRESS' : pl.status
    return { status: 200, data: pl }
  }],
  ['POST', /^\/pick-lists\/([^/]+)\/complete$/, (m) => {
    const pl = db.pickLists.get(m[1])
    if (!pl) return error(404, 'RESOURCE_NOT_FOUND', 'Pick list not found')
    if (pl.items.some((it) => !it.picked && !it.shortage)) {
      return error(409, 'BUSINESS_RULE_VIOLATION', 'All items must be picked or flagged as shortage before completing')
    }
    pl.status = 'COMPLETED'
    const order = db.orders.find((o) => o.id === pl.orderId)
    if (order) order.status = 'PICKED'
    return { status: 200, data: undefined }
  }],

  /* -------------------------------- packing -------------------------------- */
  ['POST', /^\/orders\/([^/]+)\/packing$/, (m) => {
    const order = db.orders.find((o) => o.id === m[1])
    if (!order) return error(404, 'RESOURCE_NOT_FOUND', 'Order not found')
    const existing = [...db.packingTasks.values()].find((t) => t.orderId === order.id)
    if (existing) return existing
    const task = {
      packingId: db.uid('pk'),
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'OPEN' as const,
      createdAt: new Date().toISOString(),
      items: order.items.map((it) => ({ productId: it.productId, sku: it.sku, name: it.name, quantity: it.quantity, verified: false })),
    }
    db.packingTasks.set(task.packingId, task)
    return { status: 201, data: task }
  }],
  ['POST', /^\/packing\/([^/]+)\/complete$/, (m, { body }) => {
    const task = db.packingTasks.get(m[1])
    if (!task) return error(404, 'RESOURCE_NOT_FOUND', 'Packing task not found')
    if (!task.items.every((it) => it.verified)) {
      return error(409, 'BUSINESS_RULE_VIOLATION', 'Verify all items before completing the package')
    }
    task.status = 'COMPLETED'
    task.packageCount = Number(body.packageCount ?? 1)
    task.weightGrams = Number(body.weightGrams ?? 0)
    task.packagingType = body.packagingType as string as never
    const order = db.orders.find((o) => o.id === task.orderId)
    if (order) order.status = 'PACKED'
    return { status: 200, data: undefined }
  }],

  /* ------------------------------- suppliers ------------------------------- */
  ['GET', /^\/suppliers$/, (_m, { query }) => {
    let rows = [...db.suppliers]
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((s) => `${s.name} ${s.contactPerson} ${s.email}`.toLowerCase().includes(search))
    return pageOf(rows, query)
  }],
  ['GET', /^\/suppliers\/([^/]+)$/, (m) => db.suppliers.find((s) => s.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Supplier not found')],
  ['POST', /^\/suppliers$/, (_m, { body }) => {
    const supplier = { id: db.uid('sup'), status: 'ACTIVE' as const, ...body } as never
    db.suppliers.unshift(supplier)
    return { status: 201, data: supplier }
  }],
  ['PUT', /^\/suppliers\/([^/]+)$/, (m, { body }) => {
    const s = db.suppliers.find((x) => x.id === m[1])
    if (!s) return error(404, 'RESOURCE_NOT_FOUND', 'Supplier not found')
    Object.assign(s, body)
    return s
  }],
  ['DELETE', /^\/suppliers\/([^/]+)$/, (m) => {
    const idx = db.suppliers.findIndex((s) => s.id === m[1])
    if (idx === -1) return error(404, 'RESOURCE_NOT_FOUND', 'Supplier not found')
    db.suppliers.splice(idx, 1)
    return { status: 204, data: undefined }
  }],

  /* ---------------------------- purchase orders ---------------------------- */
  ['GET', /^\/purchase-orders$/, (_m, { query }) => {
    let rows = [...db.purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const status = query.get('status')
    if (status) rows = rows.filter((r) => r.status === status)
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((r) => `${r.poNumber} ${r.supplierName}`.toLowerCase().includes(search))
    return pageOf(rows, query)
  }],
  ['GET', /^\/purchase-orders\/([^/]+)$/, (m) => db.purchaseOrders.find((p) => p.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Purchase order not found')],
  ['POST', /^\/purchase-orders$/, (_m, { body }) => {
    const supplier = db.suppliers.find((s) => s.id === body.supplierId)
    if (!supplier) return error(404, 'RESOURCE_NOT_FOUND', 'Supplier not found')
    const items = (body.items as { productId: string; quantity: number; unitCost: number }[] | undefined) ?? []
    if (items.length === 0) {
      return error(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'items', message: 'At least one line item is required' },
      ])
    }
    const po = {
      id: db.uid('po'),
      poNumber: `PO-2026-${String(200 + db.purchaseOrders.length)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      warehouseId: 'w-1',
      status: 'SUBMITTED' as const,
      items: items.map((it) => {
        const p = db.products.find((x) => x.id === it.productId)
        return {
          productId: it.productId,
          sku: p?.sku ?? '',
          name: p?.name ?? '',
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          lineTotal: Number(it.quantity) * Number(it.unitCost),
          receivedQuantity: 0,
          damagedQuantity: 0,
        }
      }),
      total: items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitCost), 0),
      expectedDeliveryDate: body.expectedDeliveryDate as string | undefined,
      createdAt: new Date().toISOString(),
      statusHistory: [
        { status: 'DRAFT' as const, changedBy: 'Neha Verma', changedAt: new Date().toISOString() },
        { status: 'SUBMITTED' as const, changedBy: 'Neha Verma', changedAt: new Date().toISOString() },
      ],
    }
    db.purchaseOrders.unshift(po)
    return { status: 201, data: po }
  }],
  ['POST', /^\/purchase-orders\/([^/]+)\/approve$/, (m) => {
    const po = db.purchaseOrders.find((p) => p.id === m[1])
    if (!po) return error(404, 'RESOURCE_NOT_FOUND', 'Purchase order not found')
    if (po.status !== 'SUBMITTED') return error(409, 'INVALID_STATE_TRANSITION', `Only SUBMITTED purchase orders can be approved (current: ${po.status})`)
    po.status = 'APPROVED'
    po.statusHistory.push({ status: 'APPROVED', changedBy: 'Priya Sharma', changedAt: new Date().toISOString() })
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/purchase-orders\/([^/]+)\/submit$/, (m) => {
    const po = db.purchaseOrders.find((p) => p.id === m[1])
    if (!po) return error(404, 'RESOURCE_NOT_FOUND', 'Purchase order not found')
    if (po.status !== 'DRAFT') return error(409, 'INVALID_STATE_TRANSITION', 'Only DRAFT purchase orders can be submitted')
    po.status = 'SUBMITTED'
    po.statusHistory.push({ status: 'SUBMITTED', changedBy: 'Neha Verma', changedAt: new Date().toISOString() })
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/purchase-orders\/([^/]+)\/cancel$/, (m) => {
    const po = db.purchaseOrders.find((p) => p.id === m[1])
    if (!po) return error(404, 'RESOURCE_NOT_FOUND', 'Purchase order not found')
    if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
      return error(409, 'INVALID_STATE_TRANSITION', `Cannot cancel a ${po.status} purchase order`)
    }
    po.status = 'CANCELLED'
    po.statusHistory.push({ status: 'CANCELLED', changedBy: 'Priya Sharma', changedAt: new Date().toISOString() })
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/purchase-orders\/([^/]+)\/receive$/, (m, { body }) => {
    const po = db.purchaseOrders.find((p) => p.id === m[1])
    if (!po) return error(404, 'RESOURCE_NOT_FOUND', 'Purchase order not found')
    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      return error(409, 'INVALID_STATE_TRANSITION', `Only APPROVED purchase orders can receive stock (current: ${po.status})`)
    }
    const lines = (body.items as { productId: string; receivedQuantity: number; damagedQuantity: number }[] | undefined) ?? []
    for (const line of lines) {
      const item = po.items.find((it) => it.productId === line.productId)
      if (!item) continue
      const alreadyReceived = item.receivedQuantity ?? 0
      if (alreadyReceived + line.receivedQuantity > item.quantity) {
        return error(409, 'BUSINESS_RULE_VIOLATION', `Received quantity exceeds ordered quantity for ${item.sku}`)
      }
      item.receivedQuantity = alreadyReceived + line.receivedQuantity
      item.damagedQuantity = (item.damagedQuantity ?? 0) + (line.damagedQuantity ?? 0)
      // receivedStock += receivedQuantity — damaged units never become sellable
      const inv = db.inventory.find((i) => i.productId === item.productId)
      const product = db.products.find((p) => p.id === item.productId)
      if (inv && product) {
        inv.physicalStock += line.receivedQuantity - (line.damagedQuantity ?? 0)
        inv.damagedStock += line.damagedQuantity ?? 0
        inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.damagedStock)
        inv.incomingStock = Math.max(0, inv.incomingStock - line.receivedQuantity - (line.damagedQuantity ?? 0))
        product.stock = inv.physicalStock
        product.availableStock = inv.availableStock
      }
    }
    const fullyReceived = po.items.every((it) => (it.receivedQuantity ?? 0) >= it.quantity)
    const anyReceived = po.items.some((it) => (it.receivedQuantity ?? 0) > 0)
    po.status = fullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status
    po.statusHistory.push({ status: po.status, changedBy: 'Ravi Kumar', changedAt: new Date().toISOString() })
    return { status: 200, data: undefined }
  }],

  /* -------------------------------- returns -------------------------------- */
  ['GET', /^\/returns$/, (_m, { query }) => {
    let rows = [...db.returns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const status = query.get('status')
    if (status) rows = rows.filter((r) => r.status === status)
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((r) => `${r.returnNumber} ${r.orderNumber} ${r.customerName}`.toLowerCase().includes(search))
    return pageOf(rows, query)
  }],
  ['GET', /^\/returns\/([^/]+)$/, (m) => db.returns.find((r) => r.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Return not found')],
  ['POST', /^\/returns$/, (_m, { body }) => {
    const order = db.orders.find((o) => o.id === body.orderId)
    if (!order) return error(404, 'RESOURCE_NOT_FOUND', 'Order not found')
    const items = (body.items as { orderItemId: string; quantity: number }[] | undefined) ?? []
    const ret = {
      id: db.uid('ret'),
      returnNumber: `RET-2026-${String(20 + db.returns.length)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: 'REQUESTED' as const,
      reason: body.reason as string as never,
      items: items.map((it) => {
        const oi = order.items.find((x) => x.id === it.orderItemId)
        return {
          orderItemId: it.orderItemId,
          productId: oi?.productId ?? '',
          sku: oi?.sku ?? '',
          name: oi?.name ?? '',
          quantity: Number(it.quantity),
        }
      }),
      refundAmount: items.reduce((sum, it) => {
        const oi = order.items.find((x) => x.id === it.orderItemId)
        return sum + (oi ? oi.unitPrice * Number(it.quantity) : 0)
      }, 0),
      createdAt: new Date().toISOString(),
    }
    db.returns.unshift(ret)
    return { status: 201, data: ret }
  }],
  ['POST', /^\/returns\/([^/]+)\/approve$/, (m) => {
    const ret = db.returns.find((r) => r.id === m[1])
    if (!ret) return error(404, 'RESOURCE_NOT_FOUND', 'Return not found')
    if (ret.status !== 'REQUESTED') return error(409, 'INVALID_STATE_TRANSITION', `Only REQUESTED returns can be approved (current: ${ret.status})`)
    ret.status = 'APPROVED'
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/returns\/([^/]+)\/reject$/, (m) => {
    const ret = db.returns.find((r) => r.id === m[1])
    if (!ret) return error(404, 'RESOURCE_NOT_FOUND', 'Return not found')
    if (ret.status !== 'REQUESTED') return error(409, 'INVALID_STATE_TRANSITION', 'Only REQUESTED returns can be rejected')
    ret.status = 'REJECTED'
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/returns\/([^/]+)\/inspect$/, (m, { body }) => {
    const ret = db.returns.find((r) => r.id === m[1])
    if (!ret) return error(404, 'RESOURCE_NOT_FOUND', 'Return not found')
    if (ret.status !== 'APPROVED') return error(409, 'INVALID_STATE_TRANSITION', 'Return must be approved before inspection')
    ret.inspection = {
      condition: body.condition as string as never,
      restockable: Boolean(body.restockable),
      notes: body.notes as string | undefined,
    }
    ret.status = 'INSPECTED'
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/returns\/([^/]+)\/resolve$/, (m, { body }) => {
    const ret = db.returns.find((r) => r.id === m[1])
    if (!ret) return error(404, 'RESOURCE_NOT_FOUND', 'Return not found')
    if (ret.status !== 'INSPECTED') return error(409, 'INVALID_STATE_TRANSITION', 'Return must be inspected before resolution')
    ret.resolution = body.resolution as string as never
    ret.status = 'RESOLVED'
    return { status: 200, data: undefined }
  }],

  /* ------------------------------- customers ------------------------------- */
  ['GET', /^\/customers$/, (_m, { query }) => {
    let rows = [...db.customers]
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(search))
    const segment = query.get('segment')
    if (segment) rows = rows.filter((c) => c.segment === segment)
    return pageOf(rows, query)
  }],
  ['GET', /^\/customers\/([^/]+)\/analytics$/, (m) => {
    const c = db.customers.find((x) => x.id === m[1])
    if (!c) return error(404, 'RESOURCE_NOT_FOUND', 'Customer not found')
    return {
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      averageOrderValue: Math.round((c.totalSpent / Math.max(1, c.totalOrders)) * 100) / 100,
      firstPurchase: c.createdAt.slice(0, 10),
      lastPurchase: db.orders.find((o) => o.customerEmail === c.email)?.createdAt.slice(0, 10) ?? c.createdAt.slice(0, 10),
      segment: c.segment,
    }
  }],
  ['GET', /^\/customers\/([^/]+)\/orders$/, (m, { query }) => {
    const c = db.customers.find((x) => x.id === m[1])
    if (!c) return error(404, 'RESOURCE_NOT_FOUND', 'Customer not found')
    return pageOf(
      db.orderSummaries().filter((o) => o.customerEmail === c.email),
      query,
    )
  }],
  ['GET', /^\/customers\/([^/]+)$/, (m) => db.customers.find((c) => c.id === m[1]) ?? error(404, 'RESOURCE_NOT_FOUND', 'Customer not found')],

  /* ------------------------------- analytics ------------------------------- */
  ['GET', /^\/analytics\/profit$/, () => ({
    revenue: 1842300.0,
    productCost: 620000.0,
    shippingCost: 120000.0,
    packagingCost: 32000.0,
    paymentFees: 41000.0,
    discounts: 75000.0,
    estimatedProfit: 954300.0,
    profitMarginPercent: 51.8,
  })],
  ['GET', /^\/analytics\/product-profitability$/, () => {
    const top = db.topProducts()
    return {
      data: top.map((t) => {
        const p = db.products.find((x) => x.id === t.productId)
        const cost = t.unitsSold * (p?.costPrice ?? 0)
        return {
          productId: t.productId,
          sku: t.sku,
          name: t.name,
          unitsSold: t.unitsSold,
          revenue: t.revenue,
          cost,
          profit: t.revenue - cost,
          marginPercent: t.revenue > 0 ? Math.round(((t.revenue - cost) / t.revenue) * 1000) / 10 : 0,
        }
      }),
    }
  }],
  ['GET', /^\/analytics\/dead-stock$/, () => ({ data: db.deadStock() })],
  ['GET', /^\/analytics\/best-sellers$/, () => ({ data: db.bestSellers() })],
  ['GET', /^\/analytics\/inventory-valuation$/, () => {
    const byCategory = db.categories.map((c) => {
      const items = db.products.filter((p) => p.categoryId === c.id)
      return {
        category: c.name,
        units: items.reduce((s, p) => s + p.stock, 0),
        value: items.reduce((s, p) => s + p.stock * p.costPrice, 0),
      }
    })
    return {
      totalValue: byCategory.reduce((s, c) => s + c.value, 0),
      totalUnits: byCategory.reduce((s, c) => s + c.units, 0),
      totalSkus: db.products.length,
      byCategory,
    }
  }],

  /* ----------------------------- notifications ----------------------------- */
  ['GET', /^\/notifications$/, (_m, { query }) => {
    let rows = [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (query.get('unreadOnly') === 'true') rows = rows.filter((n) => !n.read)
    return pageOf(rows, query)
  }],
  ['PATCH', /^\/notifications\/([^/]+)\/read$/, (m) => {
    const n = db.notifications.find((x) => x.id === m[1])
    if (n) n.read = true
    return { status: 200, data: undefined }
  }],
  ['POST', /^\/notifications\/read-all$/, () => {
    db.notifications.forEach((n) => (n.read = true))
    return { status: 200, data: undefined }
  }],

  /* -------------------------------- users ---------------------------------- */
  ['GET', /^\/users$/, (_m, { query }) => {
    let rows = [...db.users]
    const search = query.get('search')?.toLowerCase()
    if (search) rows = rows.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(search))
    return pageOf(rows, query)
  }],
  ['POST', /^\/users$/, (_m, { body }) => {
    if (db.users.some((u) => u.email.toLowerCase() === String(body.email ?? '').toLowerCase())) {
      return error(409, 'DUPLICATE_RESOURCE', 'A user with this email already exists')
    }
    const user = {
      id: db.uid('u'),
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      role: body.role as string as never,
      active: true,
    }
    db.users.push(user)
    return { status: 201, data: user }
  }],
  ['PUT', /^\/users\/([^/]+)$/, (m, { body }) => {
    const u = db.users.find((x) => x.id === m[1])
    if (!u) return error(404, 'RESOURCE_NOT_FOUND', 'User not found')
    Object.assign(u, body)
    return u
  }],
  ['PATCH', /^\/users\/([^/]+)\/status$/, (m, { body }) => {
    const u = db.users.find((x) => x.id === m[1])
    if (!u) return error(404, 'RESOURCE_NOT_FOUND', 'User not found')
    u.active = Boolean(body.active)
    return { status: 200, data: undefined }
  }],

  /* ------------------------------ audit logs ------------------------------- */
  ['GET', /^\/audit-logs$/, (_m, { query }) => {
    let rows = [...db.auditLogs]
    const entityType = query.get('entityType')
    if (entityType) rows = rows.filter((l) => l.entityType === entityType)
    const action = query.get('action')
    if (action) rows = rows.filter((l) => l.action === action)
    return pageOf(rows, query)
  }],

  /* -------------------------------- shopify -------------------------------- */
  ['GET', /^\/integrations\/shopify$/, () => db.shopifyIntegration],
  ['POST', /^\/integrations\/shopify\/connect$/, () => ({ started: true, message: 'Connection flow started' })],
  ['POST', /^\/integrations\/shopify\/sync\/(products|orders|inventory|customers|full)$/, (m) => {
    const key = (m[1] === 'full' ? 'full' : m[1]) as 'products' | 'orders' | 'inventory' | 'customers' | 'full'
    const integration = db.shopifyIntegration
    if (!integration.connected) return error(409, 'INTEGRATION_ERROR', 'Shopify store is not connected')
    if (key !== 'full') {
      integration.sync[key] = { status: 'IDLE', lastSyncAt: new Date().toISOString() }
    } else {
      integration.sync.products = { status: 'IDLE', lastSyncAt: new Date().toISOString() }
      integration.sync.orders = { status: 'IDLE', lastSyncAt: new Date().toISOString() }
      integration.sync.inventory = { status: 'IDLE', lastSyncAt: new Date().toISOString() }
      integration.sync.customers = { status: 'IDLE', lastSyncAt: new Date().toISOString() }
    }
    db.syncLogs.unshift({
      id: db.uid('sl'),
      type: key === 'full' ? 'FULL' : (key.toUpperCase() as never),
      status: 'SUCCESS',
      message: `${key} sync triggered manually`,
      recordsProcessed: db.between(10, 800),
      createdAt: new Date().toISOString(),
    })
    return { started: true, message: `${key} sync started` }
  }],
  ['GET', /^\/integrations\/shopify\/sync\/logs$/, () => ({ data: db.syncLogs })],
]

/* ------------------------------ helper fns ------------------------------ */

function error(status: number, code: ApiErrorBody['code'], message: string, errors?: ApiErrorBody['errors']): never {
  throw Object.assign(new Error(message), { __mockError: { status, code, message, errors } })
}

type AnyRow = { id?: string; sku?: string; name?: string; [k: string]: unknown }

function pageOf<T>(rows: T[], query: URLSearchParams): Page<T> {
  let list = [...rows] as AnyRow[]
  const search = query.get('search')?.toLowerCase()
  if (search) {
    list = list.filter((r) => `${r.name ?? ''} ${r.sku ?? ''}`.toLowerCase().includes(search))
  }
  const sortRaw = query.get('sort')
  if (sortRaw) {
    const [field, dir] = sortRaw.split(',')
    list = [...list].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (typeof av === 'number' && typeof bv === 'number') return dir === 'desc' ? bv - av : av - bv
      return dir === 'desc'
        ? String(bv ?? '').localeCompare(String(av ?? ''))
        : String(av ?? '').localeCompare(String(bv ?? ''))
    })
  }
  const page = Math.max(0, Number(query.get('page') ?? 0))
  const size = Math.max(1, Number(query.get('size') ?? 20))
  return {
    content: (list.slice(page * size, page * size + size) as unknown) as T[],
    page,
    size,
    totalElements: list.length,
    totalPages: Math.max(1, Math.ceil(list.length / size)),
    first: page === 0,
    last: page >= Math.ceil(list.length / size) - 1,
  }
}

/* ------------------------------ auth mocks ------------------------------ */

const ACCESS_PREFIX = 'mock-access'
const REFRESH_PREFIX = 'mock-refresh'

function mockLogin(email: string, _password: string): unknown {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!user) {
    return error(401, 'UNAUTHORIZED', 'Invalid email or password')
  }
  return {
    accessToken: `${ACCESS_PREFIX}-${user.id}`,
    refreshToken: `${REFRESH_PREFIX}-${user.id}`,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

function mockRegister(name: string, email: string): unknown {
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return error(409, 'DUPLICATE_RESOURCE', 'A user with this email already exists')
  }
  const user = { id: db.uid('u'), name, email, role: 'WAREHOUSE_STAFF' as const, active: true }
  db.users.push(user)
  return {
    user,
    accessToken: `${ACCESS_PREFIX}-${user.id}`,
    refreshToken: `${REFRESH_PREFIX}-${user.id}`,
  }
}

function mockRefresh(refreshToken: string): unknown {
  const userId = refreshToken.replace(REFRESH_PREFIX, 'u')
  const user = db.users.find((u) => u.id === userId || refreshToken.endsWith(u.id))
  if (!user) return error(401, 'UNAUTHORIZED', 'Refresh token is invalid or expired')
  return { accessToken: `${ACCESS_PREFIX}-${user.id}`, refreshToken: `${REFRESH_PREFIX}-${user.id}` }
}

function userFromToken(config: InternalAxiosRequestConfig): import('@/types/api').User | null {
  const auth = (config.headers as AxiosHeaders).get?.('Authorization') ?? ''
  const token = String(auth).replace('Bearer ', '')
  const user = db.users.find((u) => token.endsWith(u.id))
  return user ?? db.users.find((u) => u.role === 'OWNER') ?? null
}

/* ------------------------------- adapter -------------------------------- */

interface MockError extends Error {
  __mockError?: { status: number; code: string; message: string; errors?: ApiErrorBody['errors'] }
}

export function installMockAdapter(client: import('axios').AxiosInstance): void {
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 220))

    const method = (config.method ?? 'get').toUpperCase()
    const url = (config.url ?? '').split('?')[0]
    const query = new URLSearchParams(
      Object.entries(config.params ?? {}).map(([k, v]) => [k, String(v)]),
    )

    let body: Record<string, unknown> = {}
    if (typeof config.data === 'string' && config.data) {
      try {
        body = JSON.parse(config.data) as Record<string, unknown>
      } catch {
        body = {}
      }
    }

    for (const [routeMethod, pattern, handler] of routes) {
      if (routeMethod !== method) continue
      const match = url.match(pattern)
      if (!match) continue

      let result: unknown
      try {
        result = handler(match, { body, query, config })
      } catch (err) {
        const mockErr = err as MockError
        if (mockErr.__mockError) {
          throw axiosError(config, mockErr.__mockError)
        }
        throw axiosError(config, { status: 500, code: 'INTERNAL_ERROR', message: 'Mock handler failure' })
      }

      if (result && typeof result === 'object' && '__mockError' in (result as MockError)) {
        throw axiosError(config, (result as MockError).__mockError!)
      }

      const envelope = (result ?? {}) as { status?: unknown; data?: unknown }
      const isEnvelope =
        result !== null &&
        typeof result === 'object' &&
        'status' in result &&
        typeof envelope.status === 'number' &&
        'data' in result
      const status = isEnvelope ? (envelope.status as number) : 200
      const data = isEnvelope ? envelope.data : result

      return {
        data: data === undefined ? null : data,
        status,
        statusText: status < 400 ? 'OK' : 'Error',
        headers: {},
        config,
      }
    }

    throw axiosError(config, { status: 404, code: 'RESOURCE_NOT_FOUND', message: `No mock handler for ${method} ${url}` })
  }

  client.defaults.adapter = adapter
}

function axiosError(
  config: InternalAxiosRequestConfig,
  detail: { status: number; code: string; message: string; errors?: ApiErrorBody['errors'] },
): AxiosErrorType {
  const errorBody: ApiErrorBody = {
    timestamp: new Date().toISOString(),
    status: detail.status,
    code: detail.code as ApiErrorBody['code'],
    message: detail.message,
    path: config.url,
    errors: detail.errors,
    traceId: `mock-${Date.now()}`,
  }
  return new AxiosError(detail.message, detail.code, config, undefined, {
    data: errorBody,
    status: detail.status,
    statusText: detail.message,
    headers: {},
    config,
  })
}
