const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:4300/api')
const PRISMA_ERROR_PATTERN = /(prisma|database_url|mysql|p1000|p1001|p1002|p1003|p1010|can't reach database|authentication failed)/i

const API_SESSION_KEY = 'rubik.erp.apiSession'
const CURRENT_USER_KEY = 'rubik.erp.currentUser'
const TEMP_DEV_PASSWORD = '123456'

export const API_AUTH_EXPIRED_EVENT = 'rubik-auth-expired'

let authRedirectRequested = false

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

const dispatchWindowEvent = (eventName, detail = {}) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

const redirectToLogin = () => {
  if (typeof window === 'undefined' || authRedirectRequested) return

  const hashPath = String(window.location.hash || '').replace(/^#/, '')
  const currentPath = hashPath || window.location.pathname || ''

  if (currentPath.startsWith('/login')) return

  authRedirectRequested = true
  window.location.hash = '/login'
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

const getFileNameFromContentDisposition = (contentDisposition = '') => {
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim())

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1]?.trim() || ''
}

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
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
  authRedirectRequested = false
  writeJsonStorage(API_SESSION_KEY, session)
  return session
}

export const clearApiSession = () => {
  removeStorage(API_SESSION_KEY)
}

const expireApiSession = () => {
  clearApiSession()
  removeStorage(CURRENT_USER_KEY)
  dispatchWindowEvent(API_AUTH_EXPIRED_EVENT, {
    message: 'Sesion API expirada. Inicia sesion nuevamente.',
  })
  redirectToLogin()
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

const getApiErrorMessage = (payload, response) => {
  const rawMessage =
    payload?.error ||
    payload?.message ||
    (typeof payload === 'string' ? payload : '') ||
    `Error API ${response.status}`

  if (PRISMA_ERROR_PATTERN.test(rawMessage)) {
    return `La API no pudo conectarse correctamente a Prisma/MySQL: ${rawMessage}`
  }

  return rawMessage
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

  if (response.status === 401 && auth && retrying) {
    expireApiSession()
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response))
  }

  return payload
}

export async function downloadFile(endpoint, options = {}) {
  const {
    auth = true,
    retrying = false,
    headers = {},
    body,
    method = 'GET',
    expectedContentType = '',
    defaultFileName = 'rubik-export',
  } = options
  const requestBody = normalizeRequestBody(body)
  const session = auth ? await ensureApiSession() : null
  const requestHeaders = {
    ...(isFormDataBody(body) ? {} : body ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...headers,
  }

  const response = await fetch(buildUrl(endpoint), {
    method,
    headers: requestHeaders,
    body: requestBody,
  })

  if (response.status === 401 && auth && !retrying) {
    clearApiSession()
    return downloadFile(endpoint, { ...options, retrying: true })
  }

  if (response.status === 401 && auth && retrying) {
    expireApiSession()
  }

  const contentType = response.headers.get('content-type') || ''

  if (!response.ok) {
    const payload = await parseResponsePayload(response.clone())
    throw new Error(getApiErrorMessage(payload, response))
  }

  if (
    expectedContentType &&
    !contentType.toLowerCase().includes(expectedContentType.toLowerCase())
  ) {
    throw new Error(`La API devolvio ${contentType || 'sin content-type'} en vez de ${expectedContentType}.`)
  }

  const blob = await response.blob()
  if (!blob || blob.size === 0) {
    throw new Error('La API devolvio un archivo vacio.')
  }

  const fileName =
    getFileNameFromContentDisposition(response.headers.get('content-disposition') || '') ||
    defaultFileName

  downloadBlob(blob, fileName)

  return {
    ok: true,
    fileName,
    size: blob.size,
    contentType,
  }
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
  downloadFile,
  axios,
}

export const api = apiClient

export default apiClient
