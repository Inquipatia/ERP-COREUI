import { get, post, put, patch, remove } from './apiClient'

export const listWorkOrders = (options = {}) => get('/work-orders', options)
export const getWorkOrderStats = () => get('/work-orders/stats')
export const getWorkOrderActivity = () => get('/work-orders/activity')
export const getWorkOrder = (id) => get(`/work-orders/${id}`)
export const createWorkOrder = (workOrder) => post('/work-orders', workOrder)
export const createWorkOrderFromQuote = (quoteId, workOrder = {}) =>
  post(`/work-orders/from-quote/${encodeURIComponent(quoteId)}`, workOrder)
export const createWorkOrderFromDocument = (documentId, workOrder = {}) =>
  post(`/work-orders/from-document/${encodeURIComponent(documentId)}`, workOrder)
export const updateWorkOrder = (id, workOrder) => put(`/work-orders/${id}`, workOrder)
export const patchWorkOrder = (id, workOrder) => patch(`/work-orders/${id}`, workOrder)
export const deleteWorkOrder = (id) => remove(`/work-orders/${id}`)
export const addWorkOrderMovement = (id, movement) => post(`/work-orders/${id}/movement`, movement)
export const addWorkOrderComment = (id, comment) => post(`/work-orders/${id}/comment`, comment)

export default {
  addWorkOrderComment,
  addWorkOrderMovement,
  createWorkOrder,
  createWorkOrderFromDocument,
  createWorkOrderFromQuote,
  deleteWorkOrder,
  getWorkOrder,
  getWorkOrderActivity,
  getWorkOrderStats,
  listWorkOrders,
  patchWorkOrder,
  updateWorkOrder,
}
