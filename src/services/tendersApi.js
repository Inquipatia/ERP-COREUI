import { get, post, put, patch, remove } from './apiClient'

export const listTenders = () => get('/tenders')
export const getTenderStats = () => get('/tenders/stats')
export const createTender = (tender) => post('/tenders', tender)
export const updateTender = (id, tender) => put(`/tenders/${id}`, tender)
export const patchTender = (id, tender) => patch(`/tenders/${id}`, tender)
export const deleteTender = (id) => remove(`/tenders/${id}`)

export default {
  createTender,
  deleteTender,
  getTenderStats,
  listTenders,
  patchTender,
  updateTender,
}
