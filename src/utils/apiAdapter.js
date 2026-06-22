import { readStorage, writeStorage } from './storage'

export const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD ? 'https://api.rubikcreaciones.com/api' : 'http://localhost:4300/api')

const getCurrentSessionUser = () => readStorage('rubik.erp.currentUser', null)

const getAuthHeaders = () => {
  const currentUser = getCurrentSessionUser()

  if (!currentUser) return {}

  return {
    'x-user-id': currentUser.id || '',
    'x-user-name': currentUser.name || '',
    'x-user-email': currentUser.email || '',
    'x-user-role': currentUser.role || '',
    'x-user-permissions': JSON.stringify(currentUser.permissions || []),
  }
}

export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(errorPayload.error || `Error API ${response.status}`)
  }

  if (response.status === 204) return null

  return response.json()
}

export const createApiStorageAdapter = ({
  storageKey,
  endpoint,
  fallbackValue = [],
  normalizeItem = (item) => item,
} = {}) => {
  if (!storageKey || !endpoint) {
    throw new Error('createApiStorageAdapter requiere storageKey y endpoint.')
  }

  const getLocal = () =>
    (Array.isArray(readStorage(storageKey, fallbackValue))
      ? readStorage(storageKey, fallbackValue)
      : fallbackValue
    ).map(normalizeItem)

  const saveLocal = (collection) => {
    const normalizedCollection = (Array.isArray(collection) ? collection : []).map(normalizeItem)
    writeStorage(storageKey, normalizedCollection)
    return normalizedCollection
  }

  const list = async ({ preferApi = true, query = '' } = {}) => {
    if (!preferApi) return getLocal()

    try {
      const payload = await apiRequest(`${endpoint}${query}`)
      const items = Array.isArray(payload?.items) ? payload.items : payload
      return saveLocal(items)
    } catch (error) {
      console.warn(`API no disponible para ${endpoint}; usando localStorage temporal.`, error)
      return getLocal()
    }
  }

  const create = async (item) => {
    const createdItem = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(item),
    })
    saveLocal([createdItem, ...getLocal().filter((currentItem) => currentItem.id !== createdItem.id)])
    return normalizeItem(createdItem)
  }

  const update = async (id, item) => {
    const updatedItem = await apiRequest(`${endpoint}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    })
    saveLocal(getLocal().map((currentItem) => (currentItem.id === id ? updatedItem : currentItem)))
    return normalizeItem(updatedItem)
  }

  const remove = async (id) => {
    await apiRequest(`${endpoint}/${id}`, { method: 'DELETE' })
    saveLocal(getLocal().filter((currentItem) => currentItem.id !== id))
  }

  return {
    getLocal,
    saveLocal,
    list,
    create,
    update,
    remove,
  }
}

export const apiResources = {
  users: '/users',
  clients: '/clients',
  quotes: '/quotes',
  documents: '/documents',
  tenders: '/tenders',
  workOrders: '/work-orders',
  finance: '/finance',
  payments: '/payments',
  suppliers: '/suppliers',
  imports: '/imports',
}
