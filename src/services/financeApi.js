import { get, post, put, patch, remove } from './apiClient'

export const getFinanceSummary = () => get('/finance/summary')
export const getFinanceStats = () => get('/finance/stats')
export const listFinanceMovements = () => get('/finance/movements')
export const getFinanceMovement = (id) => get(`/finance/movements/${id}`)
export const createFinanceMovement = (movement) => post('/finance/movements', movement)
export const updateFinanceMovement = (id, movement) => put(`/finance/movements/${id}`, movement)
export const patchFinanceMovement = (id, movement) => patch(`/finance/movements/${id}`, movement)
export const deleteFinanceMovement = (id) => remove(`/finance/movements/${id}`)
export const registerFinancePayment = (id, payment) => post(`/finance/movements/${id}/payment`, payment)
export const listPayments = () => get('/finance/payments')
export const getPayment = (id) => get(`/finance/payments/${id}`)
export const createPayment = (payment) => post('/finance/payments', payment)
export const startSandboxPayment = (id) => post(`/finance/payments/${id}/start-sandbox`, {})
export const approvePayment = (id) => post(`/finance/payments/${id}/approve`, {})
export const rejectPayment = (id, reason = '') => post(`/finance/payments/${id}/reject`, { reason })
export const cancelPayment = (id, reason = '') => post(`/finance/payments/${id}/cancel`, { reason })
export const reconcilePayment = (id) => post(`/finance/payments/${id}/reconcile`, {})
export const getPaymentAudit = (id) => get(`/finance/payments/${id}/audit`)
export const runSandboxPaymentDemo = () => post('/finance/demo/sandbox-payment', {})

export default {
  approvePayment,
  cancelPayment,
  createPayment,
  createFinanceMovement,
  deleteFinanceMovement,
  getFinanceMovement,
  getFinanceStats,
  getFinanceSummary,
  getPayment,
  getPaymentAudit,
  listFinanceMovements,
  listPayments,
  patchFinanceMovement,
  registerFinancePayment,
  rejectPayment,
  reconcilePayment,
  runSandboxPaymentDemo,
  startSandboxPayment,
  updateFinanceMovement,
}
