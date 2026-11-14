import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError } from '@/api/axiosInstance'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  errorCode: string | null
  errorStatus: number | null
}

/**
 * Minimal async data hook for one-shot API reads.
 * Returns data + loading + error and a `refetch` function.
 */
export function useApi<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null, errorCode: null, errorStatus: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null, errorCode: null, errorStatus: null }))
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, errorCode: null, errorStatus: null })
      })
      .catch((err: unknown) => {
        const apiErr = toApiError(err)
        if (!cancelled) {
          setState({ data: null, loading: false, error: apiErr.message, errorCode: apiErr.code, errorStatus: apiErr.status })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cancel = run()
    return () => cancel?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, refetch: run }
}

export default useApi
