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

export default {
  createFinanceMovement,
  deleteFinanceMovement,
  getFinanceMovement,
  getFinanceStats,
  getFinanceSummary,
  listFinanceMovements,
  patchFinanceMovement,
  registerFinancePayment,
  updateFinanceMovement,
}
