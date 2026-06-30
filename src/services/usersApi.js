import { get, post, put, patch, remove } from './apiClient'

export const listUsers = () => get('/users')
export const getUserStats = () => get('/users/stats')
export const createUser = (user) => post('/users', user)
export const updateUser = (id, user) => put(`/users/${id}`, user)
export const patchUser = (id, user) => patch(`/users/${id}`, user)
export const deleteUser = (id) => remove(`/users/${id}`)

export default {
  createUser,
  deleteUser,
  getUserStats,
  listUsers,
  patchUser,
  updateUser,
}
