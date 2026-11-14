import type { Category, Page, PageQuery, Product, ProductLocation, ProductStatus } from '@/types/api'
import { del, get, getPage, params, post, put } from './helpers'

export interface ProductListQuery extends PageQuery {
  search?: string
  categoryId?: string
  status?: ProductStatus
}

export interface ProductPayload {
  sku: string
  name: string
  categoryId: string
  description?: string
  sellingPrice: number
  costPrice: number
  taxRate?: number
  weightGrams?: number
  minimumStock: number
  barcode?: string
  supplierId?: string
}

export const productApi = {
  list: (query: ProductListQuery = {}) =>
    getPage<Product>('/products', params(query as Record<string, unknown>)),

  get: (productId: string) => get<Product>(`/products/${productId}`),

  create: (body: ProductPayload) => post<ProductPayload, Product>('/products', body),

  update: (productId: string, body: Partial<ProductPayload>) =>
    put<Partial<ProductPayload>, Product>(`/products/${productId}`, body),

  /** Soft-delete is preferred by the backend (section 6.5). */
  remove: (productId: string) => del<void>(`/products/${productId}`),

  locations: (productId: string) =>
    get<{ data: ProductLocation[] }>(`/products/${productId}/locations`),

  assignLocation: (productId: string, body: { binId: string; quantity: number }) =>
    post<{ binId: string; quantity: number }, void>(`/products/${productId}/locations`, body),
}

export interface CategoryListQuery extends PageQuery {
  search?: string
}

export interface CategoryPayload {
  name: string
  description?: string
}

export const categoryApi = {
  list: (query: CategoryListQuery = {}) =>
    get<{ data: Category[] }>('/categories', params(query)),

  create: (body: CategoryPayload) => post<CategoryPayload, Category>('/categories', body),

  update: (categoryId: string, body: Partial<CategoryPayload>) =>
    put<Partial<CategoryPayload>, Category>(`/categories/${categoryId}`, body),

  remove: (categoryId: string) => del<void>(`/categories/${categoryId}`),
}

export type { Page }
