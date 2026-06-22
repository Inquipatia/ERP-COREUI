import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

const DEFAULT_REFRESH_INTERVAL = 15000

export default function useApiResource(
  loader,
  initialValue = [],
  {
    autoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    refetchOnFocus = true,
  } = {},
) {
  const fallbackRef = useRef(initialValue)
  const loadedRef = useRef(false)
  const mountedRef = useRef(true)
  const appStateRef = useRef(AppState.currentState)
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    const isFirstLoad = !loadedRef.current && !silent

    setLoading(isFirstLoad)
    setRefreshing(!isFirstLoad)
    setError('')

    try {
      const payload = await loader()
      if (!mountedRef.current) return
      setData(payload?.items ?? payload ?? fallbackRef.current)
      loadedRef.current = true
    } catch (loadError) {
      if (!mountedRef.current) return
      loadedRef.current = true
      setError(loadError.message || 'No se pudo conectar con la API')
    } finally {
      if (!mountedRef.current) return
      setLoading(false)
      setRefreshing(false)
    }
  }, [loader])

  useEffect(() => {
    load()
  }, [load])

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  useEffect(() => {
    if (!autoRefresh) return undefined

    const timer = setInterval(() => {
      load({ silent: true })
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [autoRefresh, load, refreshInterval])

  useEffect(() => {
    if (!refetchOnFocus) return undefined

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasInactive = /inactive|background/.test(appStateRef.current)

      if (wasInactive && nextState === 'active') {
        load({ silent: true })
      }

      appStateRef.current = nextState
    })

    return () => subscription.remove()
  }, [load, refetchOnFocus])

  return { data, setData, loading, refreshing, error, reload: load }
}
