const API_BASE_URL = import.meta.env.VITE_RUBIK_API_URL || 'http://localhost:4300/api'
const API_SESSION_KEY = 'rubik.erp.apiSession'
const CURRENT_USER_KEY = 'rubik.erp.currentUser'
const TEMP_DEV_PASSWORD = '123456'

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

const readJsonStorage = (key, fallbackValue = null) => {
  if (!canUseLocalStorage()) return fallbackValue

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? JSON.parse(rawValue) : fallbackValue
  } catch (_error) {
    return fallbackValue
  }
}

const writeJsonStorage = (key, value) => {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const getStoredApiSession = () => readJsonStorage(API_SESSION_KEY, null)

export const getCurrentWebUser = () => readJsonStorage(CURRENT_USER_KEY, null)

export const getApiBaseUrl = () => API_BASE_URL

export const clearApiSession = () => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(API_SESSION_KEY)
}

export const loginToApi = async (currentUser = getCurrentWebUser()) => {
  if (!currentUser?.email) {
    throw new Error('No hay usuario local para iniciar sesion API.')
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: currentUser.email,
      password: currentUser.password || TEMP_DEV_PASSWORD,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo iniciar sesion API.')
  }

  writeJsonStorage(API_SESSION_KEY, payload)
  return payload
}

const ensureApiSession = async () => {
  const storedSession = getStoredApiSession()
  const currentUser = getCurrentWebUser()

  if (
    storedSession?.token &&
    storedSession?.user?.email &&
    currentUser?.email &&
    storedSession.user.email.toLowerCase() === currentUser.email.toLowerCase()
  ) {
    return storedSession
  }

  return loginToApi(currentUser)
}

export const apiRequest = async (endpoint, options = {}) => {
  const session = await ensureApiSession()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (response.status === 401 && !options.retrying) {
    clearApiSession()
    return apiRequest(endpoint, { ...options, retrying: true })
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Error API ${response.status}`)
  }

  return payload
}

const getCollectionEndpoint = (resource) => {
  if (resource === 'financeMovements') return '/finance/movements'
  if (resource === 'workOrders') return '/work-orders'
  return `/${resource}`
}

export const apiCollections = {
  list: async (resource) => {
    const payload = await apiRequest(getCollectionEndpoint(resource))
    return Array.isArray(payload?.items) ? payload.items : []
  },

  create: (resource, item) =>
    apiRequest(getCollectionEndpoint(resource), {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  update: (resource, id, item) =>
    apiRequest(`${getCollectionEndpoint(resource)}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    }),

  remove: (resource, id) =>
    apiRequest(`${getCollectionEndpoint(resource)}/${id}`, {
      method: 'DELETE',
    }),
}

export const importBrowserLocalStorageToApi = async () => {
  if (!canUseLocalStorage()) {
    throw new Error('localStorage no esta disponible en este navegador.')
  }

  const localStorageDump = {}

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    localStorageDump[key] = window.localStorage.getItem(key)
  }

  return apiRequest('/dev/import-local-storage', {
    method: 'POST',
    body: JSON.stringify({ localStorage: localStorageDump }),
  })
}

export const getApiStatus = () => apiRequest('/dev/status')
