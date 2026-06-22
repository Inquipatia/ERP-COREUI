const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:4300/api')

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

const removeStorage = (key) => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(key)
}

const getStoredApiSession = () => readJsonStorage(API_SESSION_KEY, null)

const buildUrl = (endpoint = '') => {
  if (String(endpoint).startsWith('http')) return endpoint

  const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, '')
  const normalizedEndpoint = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`
  return `${normalizedBaseUrl}${normalizedEndpoint}`
}

const parseResponsePayload = async (response) => {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }

  return response.text().catch(() => null)
}

const normalizeRequestBody = (body) => {
  if (body === undefined || body === null) return undefined
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

const isFormDataBody = (body) => typeof FormData !== 'undefined' && body instanceof FormData

export const getApiBaseUrl = () => API_BASE_URL

export const getCurrentWebUser = () => readJsonStorage(CURRENT_USER_KEY, null)

export const setApiSession = (session) => {
  writeJsonStorage(API_SESSION_KEY, session)
  return session
}

export const clearApiSession = () => {
  removeStorage(API_SESSION_KEY)
}

export const post = async (endpoint, data, options = {}) =>
  apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data,
  })

export const get = async (endpoint, options = {}) =>
  apiRequest(endpoint, {
    ...options,
    method: 'GET',
  })

export const put = async (endpoint, data, options = {}) =>
  apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data,
  })

export const patch = async (endpoint, data, options = {}) =>
  apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: data,
  })

export const remove = async (endpoint, options = {}) =>
  apiRequest(endpoint, {
    ...options,
    method: 'DELETE',
  })

export const loginToApi = async (currentUser = getCurrentWebUser()) => {
  if (!currentUser?.email) {
    throw new Error('No hay usuario local para iniciar sesion API.')
  }

  const payload = await post(
    '/auth/login',
    {
      email: currentUser.email,
      password: currentUser.password || TEMP_DEV_PASSWORD,
    },
    { auth: false },
  )

  setApiSession(payload)
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

export async function apiRequest(endpoint, options = {}) {
  const {
    auth = true,
    retrying = false,
    headers = {},
    body,
    ...fetchOptions
  } = options
  const requestBody = normalizeRequestBody(body)
  const session = auth ? await ensureApiSession() : null
  const requestHeaders = {
    ...(isFormDataBody(body) ? {} : { 'Content-Type': 'application/json' }),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...headers,
  }

  const response = await fetch(buildUrl(endpoint), {
    ...fetchOptions,
    headers: requestHeaders,
    body: requestBody,
  })
  const payload = await parseResponsePayload(response)

  if (response.status === 401 && auth && !retrying) {
    clearApiSession()
    return apiRequest(endpoint, { ...options, retrying: true })
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload || `Error API ${response.status}`)
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
    const payload = await get(getCollectionEndpoint(resource))
    return Array.isArray(payload?.items) ? payload.items : []
  },

  create: (resource, item) => post(getCollectionEndpoint(resource), item),

  update: (resource, id, item) => put(`${getCollectionEndpoint(resource)}/${id}`, item),

  remove: (resource, id) => remove(`${getCollectionEndpoint(resource)}/${id}`),
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

  return post('/dev/import-local-storage', { localStorage: localStorageDump })
}

export const getApiStatus = () => get('/dev/status', { auth: false })

const toAxiosResponse = async (requestPromise) => ({ data: await requestPromise })

export const axios = {
  get: (endpoint, config = {}) =>
    toAxiosResponse(get(endpoint, { headers: config.headers, auth: config.auth })),
  post: (endpoint, data, config = {}) =>
    toAxiosResponse(post(endpoint, data, { headers: config.headers, auth: config.auth })),
  put: (endpoint, data, config = {}) =>
    toAxiosResponse(put(endpoint, data, { headers: config.headers, auth: config.auth })),
  patch: (endpoint, data, config = {}) =>
    toAxiosResponse(patch(endpoint, data, { headers: config.headers, auth: config.auth })),
  delete: (endpoint, config = {}) =>
    toAxiosResponse(remove(endpoint, { headers: config.headers, auth: config.auth })),
}

export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: remove,
  axios,
}

export const api = apiClient

export default apiClient
