import type { ConfirmPackageRequest, PackingTask } from '@/types/api'
import { post } from './helpers'

export const packingApi = {
  /** Create a packing task for an order (11.1). */
  createTask: (orderId: string) => post<void, PackingTask>(`/orders/${orderId}/packing`),

  /** Verify + confirm the package; completes the task (11.2). */
  complete: (packingId: string, body: ConfirmPackageRequest) =>
    post<ConfirmPackageRequest, void>(`/packing/${packingId}/complete`, body),
}
