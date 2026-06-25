const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/status', async (_request, response, next) => {
  try {
    const adapterMode =
      process.env.RUBIK_DATA_ADAPTER ||
      (process.env.NODE_ENV === 'production' ? 'prisma' : 'json')
    const usesDatabase = ['prisma', 'mysql', 'postgres'].includes(adapterMode)

    response.json({
      status: 'ok',
      storage: usesDatabase ? 'database' : 'server/data/rubik-db.json',
      adapter: usesDatabase ? 'prisma' : 'json',
      counts: await dataAdapter.getCounts(),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/import-local-storage', requireAuth, async (request, response, next) => {
  try {
    response.json(await dataAdapter.importLocalStorage(request.body || {}))
  } catch (error) {
    next(error)
  }
})

module.exports = router
