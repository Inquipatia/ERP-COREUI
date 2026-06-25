const LOCAL_API_BASE_URL = 'http://localhost:4300/api'
const PRODUCTION_API_BASE_URL = 'https://api.rubikcreaciones.com/api'
const API_SESSION_STORAGE_KEY = 'rubik.erp.apiSession'
const CURRENT_USER_STORAGE_KEY = 'rubik.erp.currentUser'

const normalizeBaseUrl = (url = '') => String(url || '').replace(/\/+$/, '')

const safeJsonParse = (value, fallbackValue = null) => {
  try {
    return value ? JSON.parse(value) : fallbackValue
  } catch (error) {
    return fallbackValue
  }
}

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

const readLocalStorage = (key, fallbackValue = null) => {
  if (!canUseLocalStorage()) return fallbackValue
  return safeJsonParse(window.localStorage.getItem(key), fallbackValue)
}

const writeLocalStorage = (key, value) => {
  if (!canUseLocalStorage()) return

  if (value === null || value === undefined) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

const getApiSession = () => readLocalStorage(API_SESSION_STORAGE_KEY, null)

export const getApiBaseUrl = () =>
  normalizeBaseUrl(
    import.meta.env.VITE_RUBIK_API_URL ||
      (import.meta.env.DEV ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL),
  )

export const getCurrentWebUser = () => readLocalStorage(CURRENT_USER_STORAGE_KEY, null)

export const setApiSession = (session = {}) => {
  writeLocalStorage(API_SESSION_STORAGE_KEY, session)
  return session
}

export const clearApiSession = () => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(API_SESSION_STORAGE_KEY)
}

export const buildUrl = (endpoint = '') => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint

  const normalizedEndpoint = String(endpoint || '').startsWith('/')
    ? endpoint
    : `/${endpoint}`

  return `${getApiBaseUrl()}${normalizedEndpoint}`
}

const getAuthHeaders = ({ auth = true } = {}) => {
  if (!auth) return {}

  const session = getApiSession()
  const currentUser = session?.user || getCurrentWebUser()
  const token = session?.token || session?.accessToken

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(currentUser?.id ? { 'X-User-Id': currentUser.id } : {}),
    ...(currentUser?.name ? { 'X-User-Name': currentUser.name } : {}),
    ...(currentUser?.email ? { 'X-User-Email': currentUser.email } : {}),
    ...(currentUser?.role ? { 'X-User-Role': currentUser.role } : {}),
    ...(currentUser?.permissions
      ? { 'X-User-Permissions': JSON.stringify(currentUser.permissions) }
      : {}),
  }
}

const parseResponse = async (response) => {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  if (contentType.includes('text/')) {
    return response.text()
  }

  return response.blob()
}

export const apiRequest = async (endpoint, options = {}) => {
  const {
    auth = true,
    body,
    headers = {},
    method = 'GET',
    ...fetchOptions
  } = options

  const hasBody = body !== undefined && body !== null
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const response = await fetch(buildUrl(endpoint), {
    ...fetchOptions,
    body: isFormData || !hasBody ? body : JSON.stringify(body),
    headers: {
      ...(!isFormData && hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders({ auth }),
      ...headers,
    },
    method,
  })

  const payload = await parseResponse(response).catch(() => null)

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Error API ${response.status} en ${endpoint}`

    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const get = (endpoint, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'GET' })

export const post = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, body, method: 'POST' })

export const put = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, body, method: 'PUT' })

export const patch = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, body, method: 'PATCH' })

export const remove = (endpoint, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'DELETE' })

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export const apiCollections = {
  endpoints: {
    users: '/users',
    clients: '/clients',
    quotes: '/quotes',
    documents: '/documents',
    tenders: '/tenders',
    workOrders: '/work-orders',
    financeMovements: '/finance/movements',
    suppliers: '/suppliers',
  },
  getEndpoint(resource) {
    return this.endpoints[resource] || `/${resource}`
  },
  async list(resource, options = {}) {
    const payload = await get(this.getEndpoint(resource), options)
    return normalizeListPayload(payload)
  },
  create(resource, item, options = {}) {
    return post(this.getEndpoint(resource), item, options)
  },
  update(resource, id, item, options = {}) {
    return put(`${this.getEndpoint(resource)}/${id}`, item, options)
  },
  patch(resource, id, item, options = {}) {
    return patch(`${this.getEndpoint(resource)}/${id}`, item, options)
  },
  remove(resource, id, options = {}) {
    return apiRequest(`${this.getEndpoint(resource)}/${id}`, { ...options, method: 'DELETE' })
  },
}

export const importBrowserLocalStorageToApi = (payload, options = {}) =>
  post('/dev/import-local-storage', payload, options)

export const getApiStatus = (options = {}) => get('/dev/status', options)

const axiosRequest = async ({ data, method = 'GET', url, ...options } = {}) => {
  const responseData = await apiRequest(url, {
    ...options,
    body: data,
    method,
  })

  return {
    data: responseData,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { data, method, url, ...options },
  }
}

export const axios = {
  request: axiosRequest,
  get: (url, options = {}) => axiosRequest({ ...options, method: 'GET', url }),
  post: (url, data, options = {}) => axiosRequest({ ...options, data, method: 'POST', url }),
  put: (url, data, options = {}) => axiosRequest({ ...options, data, method: 'PUT', url }),
  patch: (url, data, options = {}) => axiosRequest({ ...options, data, method: 'PATCH', url }),
  delete: (url, options = {}) => axiosRequest({ ...options, method: 'DELETE', url }),
}

export const apiClient = {
  axios,
  apiCollections,
  apiRequest,
  buildUrl,
  clearApiSession,
  delete: remove,
  get,
  getApiBaseUrl,
  getApiStatus,
  getCurrentWebUser,
  importBrowserLocalStorageToApi,
  patch,
  post,
  put,
  remove,
  setApiSession,
}

export const api = apiClient

export default apiClient
