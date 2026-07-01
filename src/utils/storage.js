import { useCallback, useEffect, useRef, useState } from 'react'
import { apiCollections } from '../services/apiClient'

export const STORAGE_KEYS = {
  currentUser: 'rubik.erp.currentUser',
  users: 'rubik.erp.users',
  clients: 'rubik.erp.clients',
  materials: 'rubik.erp.materials',
  products: 'rubik.erp.products',
  quotes: 'rubik.erp.quotes',
  documents: 'rubik.erp.documents',
  tenders: 'rubik.erp.tenders',
  workOrders: 'rubik.erp.workOrders',
  commercialSettings: 'rubik.erp.commercialSettings',
  financeMovements: 'rubik.erp.finance.movements',
  suppliers: 'rubik.erp.finance.suppliers',
  expenses: 'rubik.erp.finance.expenses',
  aiChatHistories: 'rubik.erp.aiChatHistories',
}

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

export const API_FALLBACK_EVENT = 'rubik-api-fallback'
export const API_FALLBACK_MESSAGE = 'API no disponible, usando respaldo local temporal'

export const notifyApiFallback = ({ key, resource, error } = {}) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return

  window.dispatchEvent(
    new CustomEvent(API_FALLBACK_EVENT, {
      detail: {
        key,
        resource,
        message: API_FALLBACK_MESSAGE,
        error: error?.message || String(error || ''),
      },
    }),
  )
}

const API_SYNC_BY_STORAGE_KEY = {
  [STORAGE_KEYS.users]: 'users',
  [STORAGE_KEYS.clients]: 'clients',
  [STORAGE_KEYS.quotes]: 'quotes',
  [STORAGE_KEYS.documents]: 'documents',
  [STORAGE_KEYS.tenders]: 'tenders',
  [STORAGE_KEYS.financeMovements]: 'financeMovements',
  [STORAGE_KEYS.suppliers]: 'suppliers',
}

const DEFAULT_API_REFRESH_INTERVAL = 15000

const canSyncCollectionWithApi = (key, value) =>
  Boolean(API_SYNC_BY_STORAGE_KEY[key]) && Array.isArray(value)

const getCollectionItemKey = (item = {}) => String(item.id || '')

const collectionItemChanged = (previousItem, nextItem) =>
  JSON.stringify(previousItem || {}) !== JSON.stringify(nextItem || {})

const syncCollectionDiffToApi = async (key, previousValue = [], nextValue = []) => {
  if (!canSyncCollectionWithApi(key, nextValue)) return

  const resource = API_SYNC_BY_STORAGE_KEY[key]
  const previousItems = Array.isArray(previousValue) ? previousValue : []
  const nextItems = Array.isArray(nextValue) ? nextValue : []
  const previousById = new Map(previousItems.map((item) => [getCollectionItemKey(item), item]))
  const nextById = new Map(nextItems.map((item) => [getCollectionItemKey(item), item]))

  const operations = []

  previousById.forEach((previousItem, itemId) => {
    if (!itemId || nextById.has(itemId)) return
    operations.push(apiCollections.remove(resource, itemId))
  })

  nextItems.forEach((nextItem) => {
    const itemId = getCollectionItemKey(nextItem)

    if (!itemId || !previousById.has(itemId)) {
      operations.push(apiCollections.create(resource, nextItem))
      return
    }

    const previousItem = previousById.get(itemId)
    if (collectionItemChanged(previousItem, nextItem)) {
      operations.push(apiCollections.update(resource, itemId, nextItem))
    }
  })

  if (operations.length === 0) return

  try {
    await Promise.all(operations)
  } catch (error) {
    notifyApiFallback({ key, resource, error })
    console.warn(`API sync failed for ${key}. Using localStorage fallback.`, error)
  }
}

export const createLocalId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const readStorage = (key, fallbackValue) => {
  if (!canUseLocalStorage()) {
    return fallbackValue
  }

  try {
    const storedValue = window.localStorage.getItem(key)

    if (!storedValue) {
      return fallbackValue
    }

    return JSON.parse(storedValue)
  } catch (error) {
    console.error(`Error reading localStorage key ${key}:`, error)
    return fallbackValue
  }
}

export const writeStorage = (key, value) => {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing localStorage key ${key}:`, error)
  }
}

export const normalizeCollection = (collection, normalizeItem = (item) => item) =>
  (Array.isArray(collection) ? collection : []).map(normalizeItem)

export const getStoredCollection = (key, fallbackValue = [], normalizeItem = (item) => item) =>
  normalizeCollection(readStorage(key, fallbackValue), normalizeItem)

export const saveStoredCollection = (key, collection) => {
  writeStorage(key, normalizeCollection(collection))
}

export const updateStoredCollection = (key, updater, fallbackValue = []) => {
  const currentCollection = readStorage(key, fallbackValue)
  const nextCollection = updater(normalizeCollection(currentCollection))
  saveStoredCollection(key, nextCollection)

  return nextCollection
}

export const upsertCollectionItem = (
  collection,
  item,
  {
    getKey = (collectionItem) => collectionItem.id,
    normalizeItem = (collectionItem) => collectionItem,
    mergeItems = (currentItem, nextItem) => ({ ...currentItem, ...nextItem }),
  } = {},
) => {
  const normalizedCollection = normalizeCollection(collection, normalizeItem)
  const nextItem = normalizeItem(item)
  const nextKey = getKey(nextItem)
  let itemWasUpdated = false

  const nextCollection = normalizedCollection.map((currentItem) => {
    if (getKey(currentItem) !== nextKey) {
      return currentItem
    }

    itemWasUpdated = true
    return normalizeItem(mergeItems(currentItem, nextItem))
  })

  return itemWasUpdated ? nextCollection : [...nextCollection, nextItem]
}

export const deleteCollectionItem = (
  collection,
  targetKey,
  {
    getKey = (collectionItem) => collectionItem.id,
    normalizeItem = (collectionItem) => collectionItem,
  } = {},
) => normalizeCollection(collection, normalizeItem).filter((item) => getKey(item) !== targetKey)

export const seedStorage = (key, initialValue) => {
  const storedValue = readStorage(key, null)

  if (storedValue !== null) {
    return storedValue
  }

  writeStorage(key, initialValue)
  return initialValue
}

export const useLocalStorageState = (key, initialValue) => {
  const [value, setValue] = useState(() => seedStorage(key, initialValue))
  const [apiState, setApiState] = useState(() => ({
    loading: Boolean(API_SYNC_BY_STORAGE_KEY[key]),
    refreshing: false,
    error: '',
  }))
  const apiLoadCompletedRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      const resource = API_SYNC_BY_STORAGE_KEY[key]
      if (!resource) return []

      setApiState((currentState) => ({
        ...currentState,
        loading: !apiLoadCompletedRef.current && !silent,
        refreshing: apiLoadCompletedRef.current || silent,
        error: '',
      }))

      try {
        const items = await apiCollections.list(resource)
        if (!isMountedRef.current || !Array.isArray(items)) return items
        apiLoadCompletedRef.current = true
        setValue(items)
        writeStorage(key, items)
        setApiState({ loading: false, refreshing: false, error: '' })
        return items
      } catch (error) {
        if (!isMountedRef.current) return []
        apiLoadCompletedRef.current = true
        setApiState({
          loading: false,
          refreshing: false,
          error: 'No se pudo conectar con la API',
        })
        notifyApiFallback({ key, resource, error })
        console.warn(`API load failed for ${key}. Using localStorage fallback.`, error)
        return []
      }
    },
    [key],
  )

  useEffect(() => {
    const resource = API_SYNC_BY_STORAGE_KEY[key]
    if (!resource) return undefined

    void reload()

    const refreshTimer = window.setInterval(() => {
      void reload({ silent: true })
    }, DEFAULT_API_REFRESH_INTERVAL)

    const handleFocus = () => {
      void reload({ silent: true })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reload({ silent: true })
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [key, reload])

  const setSyncedValue = (nextValueOrUpdater) => {
    setValue((previousValue) => {
      const nextValue =
        typeof nextValueOrUpdater === 'function'
          ? nextValueOrUpdater(previousValue)
          : nextValueOrUpdater

      if (apiLoadCompletedRef.current && canSyncCollectionWithApi(key, nextValue)) {
        void syncCollectionDiffToApi(key, previousValue, nextValue)
      }

      return nextValue
    })
  }

  return [value, setSyncedValue, { ...apiState, reload }]
}
