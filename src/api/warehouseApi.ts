import type { Bin, PageQuery, Rack, Shelf, Warehouse, Zone } from '@/types/api'
import { del, get, params, post, put } from './helpers'

export const warehouseApi = {
  // Warehouses (section 8.1)
  list: (query?: { search?: string }) => get<{ data: Warehouse[] }>('/warehouses', params(query)),
  get: (warehouseId: string) => get<Warehouse>(`/warehouses/${warehouseId}`),
  create: (body: Omit<Warehouse, 'id' | 'zoneCount' | 'binCount'>) =>
    post<Omit<Warehouse, 'id' | 'zoneCount' | 'binCount'>, Warehouse>('/warehouses', body),
  update: (warehouseId: string, body: Partial<Warehouse>) =>
    put<Partial<Warehouse>, Warehouse>(`/warehouses/${warehouseId}`, body),
  remove: (warehouseId: string) => del<void>(`/warehouses/${warehouseId}`),

  // Zones (8.2)
  zones: (warehouseId: string) => get<{ data: Zone[] }>(`/warehouses/${warehouseId}/zones`),
  createZone: (warehouseId: string, body: { code: string; name: string; description?: string }) =>
    post<{ code: string; name: string; description?: string }, Zone>(`/warehouses/${warehouseId}/zones`, body),

  // Racks (8.3)
  racks: (warehouseId: string) => get<{ data: Rack[] }>(`/warehouses/${warehouseId}/racks`),
  createRack: (warehouseId: string, body: { zoneId: string; code: string }) =>
    post<{ zoneId: string; code: string }, Rack>(`/warehouses/${warehouseId}/racks`, body),

  // Shelves (8.4)
  shelves: (warehouseId: string) => get<{ data: Shelf[] }>(`/warehouses/${warehouseId}/shelves`),
  createShelf: (warehouseId: string, body: { rackId: string; code: string }) =>
    post<{ rackId: string; code: string }, Shelf>(`/warehouses/${warehouseId}/shelves`, body),

  // Bins (8.5)
  bins: (warehouseId: string, query?: PageQuery & { search?: string }) =>
    get<{ data: Bin[] }>(`/warehouses/${warehouseId}/bins`, params(query)),
  createBin: (warehouseId: string, body: { code: string; capacity: number; shelfId?: string }) =>
    post<{ code: string; capacity: number; shelfId?: string }, Bin>(`/warehouses/${warehouseId}/bins`, body),
  updateBin: (binId: string, body: Partial<Pick<Bin, 'code' | 'capacity' | 'active'>>) =>
    put<Partial<Pick<Bin, 'code' | 'capacity' | 'active'>>, Bin>(`/bins/${binId}`, body),
}
