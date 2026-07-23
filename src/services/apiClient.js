const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:4300/api')
const PRISMA_ERROR_PATTERN =
  /(prisma|database_url|mysql|p1000|p1001|p1002|p1003|p1010|can't reach database|authentication failed)/i

export const API_SESSION_STORAGE_KEY = 'rubik.erp.apiSession'
export const CURRENT_USER_STORAGE_KEY = 'rubik.erp.currentUser'

const API_SESSION_KEY = API_SESSION_STORAGE_KEY
const CURRENT_USER_KEY = CURRENT_USER_STORAGE_KEY
const AUTH_REDIRECT_KEY = 'rubik.erp.authRedirect'
const AUTH_DEBUG_ENABLED = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_RUBIK_AUTH_DEBUG !== 'false',
)

export const API_AUTH_EXPIRED_EVENT = 'rubik-auth-expired'

let authRedirectRequested = false
let authExpiredDispatched = false

export class AuthSessionError extends Error {
  constructor(
    message = 'Sesion API invalida. Inicia sesion nuevamente.',
    reason = 'invalid_session',
  ) {
    super(message)
    this.name = 'AuthSessionError'
    this.code = 'AUTH_SESSION_INVALID'
    this.reason = reason
  }
}

export const isAuthSessionError = (error) =>
  error?.name === 'AuthSessionError' || error?.code === 'AUTH_SESSION_INVALID'

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

const logAuthDebug = (message, details = {}) => {
  if (!AUTH_DEBUG_ENABLED || typeof console === 'undefined') return
  console.debug(`[Rubik auth] ${message}`, details)
}

const dispatchWindowEvent = (eventName, detail = {}) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

const getCurrentRoutePath = () => {
  if (typeof window === 'undefined') return ''

  const hashPath = String(window.location.hash || '').replace(/^#/, '')
  if (hashPath) return hashPath

  return `${window.location.pathname || ''}${window.location.search || ''}` || ''
}

const isLoginPath = (path = '') => String(path || '').startsWith('/login')

export const getPendingAuthRedirect = () => readJsonStorage(AUTH_REDIRECT_KEY, '')

export const clearPendingAuthRedirect = () => {
  removeStorage(AUTH_REDIRECT_KEY)
}

const rememberAuthRedirect = () => {
  const currentPath = getCurrentRoutePath()

  if (!currentPath || isLoginPath(currentPath)) return
  writeJsonStorage(AUTH_REDIRECT_KEY, currentPath)
}

const redirectToLogin = () => {
  if (typeof window === 'undefined' || authRedirectRequested) return

  const currentPath = getCurrentRoutePath()

  if (isLoginPath(currentPath)) return

  rememberAuthRedirect()
  authRedirectRequested = true
  window.location.hash = '/login'
}

export const getStoredApiSession = () => readJsonStorage(API_SESSION_KEY, null)

const normalizeEmail = (email = '') =>
  String(email || '')
    .trim()
    .toLowerCase()

const sessionMatchesCurrentUser = (session, currentUser) =>
  Boolean(
    session?.token &&
    session?.user?.email &&
    currentUser?.email &&
    normalizeEmail(session.user.email) === normalizeEmail(currentUser.email),
  )

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

export const hasValidStoredApiSession = (currentUser = getCurrentWebUser()) =>
  sessionMatchesCurrentUser(getStoredApiSession(), currentUser)

export const setApiSession = (session) => {
  authRedirectRequested = false
  authExpiredDispatched = false
  if (!session?.token) {
    removeStorage(API_SESSION_KEY)
    return null
  }
  writeJsonStorage(API_SESSION_KEY, session)
  return session
}

export const clearApiSession = () => {
  removeStorage(API_SESSION_KEY)
}

const expireApiSession = () => {
  clearApiSession()
  removeStorage(CURRENT_USER_KEY)

  if (!authExpiredDispatched) {
    authExpiredDispatched = true
    dispatchWindowEvent(API_AUTH_EXPIRED_EVENT, {
      message: 'Sesion API expirada. Inicia sesion nuevamente.',
    })
  }

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

export const loginToApi = async ({ email, password } = {}) => {
  if (!email || !password) {
    throw new Error('Email y password son requeridos para iniciar sesion API.')
  }

  const payload = await post(
    '/auth/login',
    {
      email,
      password,
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

export const fetchApiCurrentUser = async (session = getStoredApiSession()) => {
  if (!session?.token) {
    throw new AuthSessionError('No hay token API guardado.', 'missing_token')
  }

  logAuthDebug('validating stored API session', {
    authMethod: 'bearer',
    hasToken: true,
    sessionUserEmail: Boolean(session?.user?.email),
  })

  const response = await fetch(buildUrl('/auth/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  })
  const payload = await parseResponsePayload(response)

  logAuthDebug('stored API session validation finished', {
    status: response.status,
    ok: response.ok,
    rejectedByApi: response.status === 401,
  })

  if (response.status === 401) {
    throw new AuthSessionError('Sesion API expirada. Inicia sesion nuevamente.', 'api_401')
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response))
  }

  return payload?.user || null
}

const ensureApiSession = () => {
  const storedSession = getStoredApiSession()
  const currentUser = getCurrentWebUser()

  if (sessionMatchesCurrentUser(storedSession, currentUser)) {
    return storedSession
  }

  const reason = !currentUser?.email
    ? 'missing_user'
    : !storedSession?.token
      ? 'missing_token'
      : 'session_user_mismatch'

  throw new AuthSessionError('Sesion API no disponible. Inicia sesion nuevamente.', reason)
}

export async function apiRequest(endpoint, options = {}) {
  const { auth = true, headers = {}, body, ...fetchOptions } = options
  const requestBody = normalizeRequestBody(body)
  let session = null

  try {
    session = auth ? ensureApiSession() : null
  } catch (error) {
    if (isAuthSessionError(error)) {
      logAuthDebug('blocked protected request without a valid API session', {
        endpoint,
        reason: error.reason,
      })
      expireApiSession()
    }

    throw error
  }

  const requestHeaders = {
    ...(isFormDataBody(body) ? {} : { 'Content-Type': 'application/json' }),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...headers,
  }

  logAuthDebug('sending API request', {
    endpoint,
    method: fetchOptions.method || 'GET',
    auth,
    authMethod: auth ? 'bearer' : 'none',
    sendsAuthorizationHeader: Boolean(requestHeaders.Authorization),
  })

  const response = await fetch(buildUrl(endpoint), {
    ...fetchOptions,
    headers: requestHeaders,
    body: requestBody,
  })
  const payload = await parseResponsePayload(response)

  if (response.status === 401 && auth) {
    logAuthDebug('API rejected protected request', {
      endpoint,
      status: response.status,
      hasStoredSession: Boolean(getStoredApiSession()?.token),
    })
    expireApiSession()
    throw new AuthSessionError('Sesion API expirada. Inicia sesion nuevamente.', 'api_401')
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response))
  }

  return payload
}

export async function downloadFile(endpoint, options = {}) {
  const {
    auth = true,
    headers = {},
    body,
    method = 'GET',
    expectedContentType = '',
    defaultFileName = 'rubik-export',
  } = options
  const requestBody = normalizeRequestBody(body)
  let session = null

  try {
    session = auth ? ensureApiSession() : null
  } catch (error) {
    if (isAuthSessionError(error)) {
      logAuthDebug('blocked protected file request without a valid API session', {
        endpoint,
        reason: error.reason,
      })
      expireApiSession()
    }

    throw error
  }

  const requestHeaders = {
    ...(isFormDataBody(body) ? {} : body ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...headers,
  }

  logAuthDebug('sending API file request', {
    endpoint,
    method,
    auth,
    authMethod: auth ? 'bearer' : 'none',
    sendsAuthorizationHeader: Boolean(requestHeaders.Authorization),
  })

  const response = await fetch(buildUrl(endpoint), {
    method,
    headers: requestHeaders,
    body: requestBody,
  })

  if (response.status === 401 && auth) {
    logAuthDebug('API rejected protected file request', {
      endpoint,
      status: response.status,
      hasStoredSession: Boolean(getStoredApiSession()?.token),
    })
    expireApiSession()
    throw new AuthSessionError('Sesion API expirada. Inicia sesion nuevamente.', 'api_401')
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
    throw new Error(
      `La API devolvio ${contentType || 'sin content-type'} en vez de ${expectedContentType}.`,
    )
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
