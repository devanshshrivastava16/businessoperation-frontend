import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, KpiCard, StockIndicator } from '@/components/ui/primitives'
import { can, accessLevel } from '@/utils/permissions'
import { orderStatusTone, poStatusTone } from '@/utils/date'
import { formatCurrency } from '@/utils/format'

describe('permissions matrix (API contract section 25)', () => {
  it('gives OWNER full access everywhere', () => {
    expect(can('OWNER', 'Users', 'full')).toBe(true)
    expect(can('OWNER', 'AuditLogs', 'full')).toBe(true)
    expect(can('OWNER', 'Purchasing', 'full')).toBe(true)
  })

  it('denies WAREHOUSE_STAFF profit and user management', () => {
    expect(can('WAREHOUSE_STAFF', 'Profit', 'read')).toBe(false)
    expect(can('WAREHOUSE_STAFF', 'Users', 'read')).toBe(false)
    expect(can('WAREHOUSE_STAFF', 'AuditLogs', 'read')).toBe(false)
  })

  it('allows WAREHOUSE_STAFF inventory updates and order fulfillment', () => {
    expect(can('WAREHOUSE_STAFF', 'Inventory', 'update')).toBe(true)
    expect(can('WAREHOUSE_STAFF', 'Orders', 'update')).toBe(true)
  })

  it('gives PURCHASING full supplier/purchasing access but read-only products', () => {
    expect(can('PURCHASING', 'Purchasing', 'full')).toBe(true)
    expect(can('PURCHASING', 'Suppliers', 'full')).toBe(true)
    expect(can('PURCHASING', 'Products', 'update')).toBe(false)
    expect(can('PURCHASING', 'Products', 'read')).toBe(true)
  })

  it('gives ACCOUNTANT full returns access', () => {
    expect(can('ACCOUNTANT', 'Returns', 'full')).toBe(true)
    expect(accessLevel('ACCOUNTANT', 'Dashboard')).toBe('full')
  })

  it('fails closed for unknown roles and modules', () => {
    expect(can(null, 'Products')).toBe(false)
    expect(can(undefined, 'Products')).toBe(false)
    expect(accessLevel('OWNER', 'NonExistentModule')).toBe('no')
  })
})

describe('status badge mapping', () => {
  it('maps order statuses to the correct visual tone', () => {
    expect(orderStatusTone('DELIVERED')).toBe('green')
    expect(orderStatusTone('CANCELLED')).toBe('red')
    expect(orderStatusTone('PENDING')).toBe('amber')
    expect(orderStatusTone('PICKING')).toBe('aloe')
  })

  it('maps purchase order statuses correctly', () => {
    expect(poStatusTone('RECEIVED')).toBe('green')
    expect(poStatusTone('CANCELLED')).toBe('red')
    expect(poStatusTone('SUBMITTED')).toBe('amber')
  })

  it('renders humanized status text', () => {
    render(<StatusBadge status="READY_TO_SHIP" />)
    expect(screen.getByText('Ready To Ship')).toBeInTheDocument()
  })
})

describe('KPI card', () => {
  it('renders label, value and positive trend', () => {
    render(<KpiCard label="Net sales" value="₹17.7L" trend={15.8} sublabel="vs previous period" />)
    expect(screen.getByText('Net sales')).toBeInTheDocument()
    expect(screen.getByText('₹17.7L')).toBeInTheDocument()
    expect(screen.getByText(/15\.8%/)).toBeInTheDocument()
  })
})

describe('stock indicator', () => {
  it('shows out-of-stock for zero availability', () => {
    render(<StockIndicator available={0} minimum={10} />)
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })

  it('shows low stock at or below minimum', () => {
    render(<StockIndicator available={5} minimum={10} />)
    expect(screen.getByText('Low stock')).toBeInTheDocument()
  })

  it('shows in stock above minimum', () => {
    render(<StockIndicator available={35} minimum={10} />)
    expect(screen.getByText('In stock')).toBeInTheDocument()
  })
})

describe('currency formatting', () => {
  it('formats numbers as INR currency', () => {
    expect(formatCurrency(899)).toMatch(/899/)
    expect(formatCurrency(undefined)).toBe('—')
  })
})
