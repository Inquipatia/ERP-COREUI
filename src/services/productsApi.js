import { get, post, put, patch, remove } from './apiClient'

export const listProducts = () => get('/products')
export const getProductStats = () => get('/products/stats')
export const createProduct = (product) => post('/products', product)
export const updateProduct = (id, product) => put(`/products/${id}`, product)
export const patchProduct = (id, product) => patch(`/products/${id}`, product)
export const deleteProduct = (id) => remove(`/products/${id}`)

export default {
  createProduct,
  deleteProduct,
  getProductStats,
  listProducts,
  patchProduct,
  updateProduct,
}
