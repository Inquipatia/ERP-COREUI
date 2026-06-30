import { get, post, put, patch, remove } from './apiClient'

export const listQuotes = () => get('/quotes')
export const getQuoteStats = () => get('/quotes/stats')
export const createQuote = (quote) => post('/quotes', quote)
export const updateQuote = (id, quote) => put(`/quotes/${id}`, quote)
export const patchQuote = (id, quote) => patch(`/quotes/${id}`, quote)
export const deleteQuote = (id) => remove(`/quotes/${id}`)
export const generateReceivableFromQuote = (id) => post(`/quotes/${id}/generate-receivable`)

export default {
  createQuote,
  deleteQuote,
  generateReceivableFromQuote,
  getQuoteStats,
  listQuotes,
  patchQuote,
  updateQuote,
}
