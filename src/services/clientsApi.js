import { get, post, put, patch, remove } from './apiClient'

export const listClients = () => get('/clients')
export const getClientStats = () => get('/clients/stats')
export const createClient = (client) => post('/clients', client)
export const updateClient = (id, client) => put(`/clients/${id}`, client)
export const patchClient = (id, client) => patch(`/clients/${id}`, client)
export const deleteClient = (id) => remove(`/clients/${id}`)

export default {
  createClient,
  deleteClient,
  getClientStats,
  listClients,
  patchClient,
  updateClient,
}
