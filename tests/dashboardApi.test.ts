import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '@/api/helpers'
import { dashboardApi } from '@/api/dashboardApi'

vi.mock('@/api/helpers', () => ({
  get: vi.fn(),
  params: vi.fn((value) => value),
}))

const mockedGet = vi.mocked(get)

describe('dashboard list responses', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('accepts a wrapped array response', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] })

    await expect(dashboardApi.alerts()).resolves.toEqual({ data: [] })
  })

  it('accepts a direct array response', async () => {
    mockedGet.mockResolvedValueOnce([])

    await expect(dashboardApi.alerts()).resolves.toEqual({ data: [] })
  })

  it('rejects a response without a list instead of passing undefined to the page', async () => {
    mockedGet.mockResolvedValueOnce({})

    await expect(dashboardApi.alerts()).rejects.toThrow(
      'Invalid response from /dashboard/alerts: expected an array or an object containing a data array',
    )
  })
})
