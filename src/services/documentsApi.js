import { get, post, put, patch, remove } from './apiClient'

export const listDocuments = () => get('/documents')
export const getDocumentStats = () => get('/documents/stats')
export const createDocument = (document) => post('/documents', document)
export const updateDocument = (id, document) => put(`/documents/${id}`, document)
export const patchDocument = (id, document) => patch(`/documents/${id}`, document)
export const deleteDocument = (id) => remove(`/documents/${id}`)

export default {
  createDocument,
  deleteDocument,
  getDocumentStats,
  listDocuments,
  patchDocument,
  updateDocument,
}
