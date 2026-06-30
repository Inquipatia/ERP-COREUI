import { get, post, put, patch, remove } from './apiClient'

export const listMaterials = () => get('/materials')
export const getMaterialStats = () => get('/materials/stats')
export const createMaterial = (material) => post('/materials', material)
export const updateMaterial = (id, material) => put(`/materials/${id}`, material)
export const patchMaterial = (id, material) => patch(`/materials/${id}`, material)
export const deleteMaterial = (id) => remove(`/materials/${id}`)

export default {
  createMaterial,
  deleteMaterial,
  getMaterialStats,
  listMaterials,
  patchMaterial,
  updateMaterial,
}
