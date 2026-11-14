import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toApiError } from '@/api/axiosInstance'
import type { Page } from '@/types/api'

export type FilterValue = string | boolean | number | undefined
export interface ListFilters {
  [key: string]: FilterValue
}

interface PagedListState<T> {
  rows: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  loading: boolean
  error: string | null
  errorStatus: number | null
  search: string
  debouncedSearch: string
  filters: ListFilters
  sort: string | null
}

/**
 * Standard hook for paginated list endpoints. Handles:
 * page/size, debounced search, arbitrary filters, sorting,
 * loading/error states and refetch.
 */
export function usePagedList<T>(
  fetcher: (query: Record<string, unknown>) => Promise<Page<T>>,
  defaultFilters: ListFilters = {},
) {
  const [state, setState] = useState<PagedListState<T>>({
    rows: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 1,
    loading: true,
    error: null,
    errorStatus: null,
    search: '',
    debouncedSearch: '',
    filters: defaultFilters,
    sort: null,
  })

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const stateRef = useRef(state)
  stateRef.current = state

  const load = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null, errorStatus: null }))
    const { page, size, debouncedSearch, filters, sort } = stateRef.current
    fetcherRef
      .current({
        page,
        size,
        search: debouncedSearch || undefined,
        ...filters,
        sort: sort ?? undefined,
      })
      .then((pageData) => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            rows: pageData.content,
            page: pageData.page,
            size: pageData.size,
            totalElements: pageData.totalElements,
            totalPages: pageData.totalPages,
            loading: false,
          }))
        }
      })
      .catch((err: unknown) => {
        const apiErr = toApiError(err)
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: apiErr.message, errorStatus: apiErr.status, rows: [] }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // debounce the search box into debouncedSearch (resets to page 0)
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => (s.search === s.debouncedSearch ? s : { ...s, debouncedSearch: s.search, page: 0 }))
    }, 350)
    return () => clearTimeout(t)
  }, [state.search])

  useEffect(() => {
    const cancel = load()
    return () => cancel?.()
  }, [load, state.page, state.size, state.debouncedSearch, state.filters, state.sort])

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), [])
  const setSize = useCallback((size: number) => setState((s) => ({ ...s, size, page: 0 })), [])
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search })), [])
  const setFilter = useCallback(
    (key: string, value: FilterValue) => setState((s) => ({ ...s, filters: { ...s.filters, [key]: value }, page: 0 })),
    [],
  )
  const setSort = useCallback((sort: string | null) => setState((s) => ({ ...s, sort, page: 0 })), [])
  const refetch = useCallback(() => load(), [load])

  return useMemo(
    () => ({
      ...state,
      setPage,
      setSize,
      setSearch,
      setFilter,
      setSort,
      refetch,
    }),
    [state, setPage, setSize, setSearch, setFilter, setSort, refetch],
  )
}

export default usePagedList
