import { get } from './apiClient'

export const getDashboardSummary = () => get('/dashboard/summary')

export const getDashboardStats = () => get('/dashboard/stats')

export const getDashboardActivity = () => get('/dashboard/activity')

export default {
  getDashboardActivity,
  getDashboardStats,
  getDashboardSummary,
}
