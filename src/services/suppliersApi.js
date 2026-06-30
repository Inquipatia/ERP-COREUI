import { get, post, put, patch, remove } from './apiClient'

export const listSuppliers = () => get('/suppliers')
export const getSupplierStats = () => get('/suppliers/stats')
export const createSupplier = (supplier) => post('/suppliers', supplier)
export const updateSupplier = (id, supplier) => put(`/suppliers/${id}`, supplier)
export const patchSupplier = (id, supplier) => patch(`/suppliers/${id}`, supplier)
export const deleteSupplier = (id) => remove(`/suppliers/${id}`)

export default {
  createSupplier,
  deleteSupplier,
  getSupplierStats,
  listSuppliers,
  patchSupplier,
  updateSupplier,
}
