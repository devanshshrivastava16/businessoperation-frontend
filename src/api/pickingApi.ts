import type { PickItemRequest, PickList } from '@/types/api'
import { post } from './helpers'

export const pickingApi = {
  /** Generate (or fetch the existing) pick list for an order (10.1). */
  generatePickList: (orderId: string) => post<void, PickList>(`/orders/${orderId}/pick-list`),

  /** Mark a single pick-list item as picked; supports shortage reporting (10.2). */
  pickItem: (pickListId: string, itemId: string, body: PickItemRequest) =>
    post<PickItemRequest, void>(`/pick-lists/${pickListId}/items/${itemId}/pick`, body),

  /** Complete picking for the whole pick list (10.3). */
  complete: (pickListId: string) => post<void, void>(`/pick-lists/${pickListId}/complete`),
}
