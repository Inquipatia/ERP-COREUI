const DEFAULT_API_URL = 'http://192.168.100.16:4300/api'

let currentSession = null

export const API_URL =
  process.env.EXPO_PUBLIC_RUBIK_API_URL ||
  process.env.RUBIK_API_URL ||
  DEFAULT_API_URL

export const setApiSession = (session) => {
  currentSession = session
}

export const getApiSession = () => currentSession

const getFriendlyApiError = (payload, status) => {
  const apiMessage = payload?.error || `Error API ${status}`

  if (status === 401 || /sesion requerida/i.test(apiMessage)) {
    return 'Debes iniciar sesión para ver esta sección.'
  }

  if (status === 403 || /permiso/i.test(apiMessage)) {
    return 'Esta sección está restringida para perfiles autorizados.'
  }

  return apiMessage
}

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(currentSession?.token ? { Authorization: `Bearer ${currentSession.token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(getFriendlyApiError(payload, response.status))
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const apiClient = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  me: () => request('/me'),

  dashboard: () => request('/dashboard'),

  clients: () => request('/clients'),

  createClient: (client) =>
    request('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),

  updateClient: (id, client) =>
    request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    }),

  quotes: () => request('/quotes'),

  createQuote: (quote) =>
    request('/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    }),

  updateQuote: (id, quote) =>
    request(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quote),
    }),

  generateReceivable: (quoteId) =>
    request(`/quotes/${quoteId}/generate-receivable`, {
      method: 'POST',
    }),

  documents: () => request('/documents'),

  createDocument: (document) =>
    request('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    }),

  tenders: () => request('/tenders'),

  createTender: (tender) =>
    request('/tenders', {
      method: 'POST',
      body: JSON.stringify(tender),
    }),

  workOrders: () => request('/work-orders'),

  createWorkOrder: (workOrder) =>
    request('/work-orders', {
      method: 'POST',
      body: JSON.stringify(workOrder),
    }),

  workOrder: (id) => request(`/work-orders/${id}`),

  updateWorkOrder: (id, workOrder) =>
    request(`/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workOrder),
    }),

  addWorkOrderComment: (id, body) =>
    request(`/work-orders/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  addWorkOrderMovement: (id, movement) =>
    request(`/work-orders/${id}/movement`, {
      method: 'POST',
      body: JSON.stringify(movement),
    }),

  financeSummary: () => request('/finance/summary'),

  financeMovements: () => request('/finance/movements'),

  createFinanceMovement: (movement) =>
    request('/finance/movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    }),

  registerPayment: (movementId, payment) =>
    request(`/finance/movements/${movementId}/payment`, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  suppliers: () => request('/suppliers'),

  createSupplier: (supplier) =>
    request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),

  users: () => request('/users'),
}
