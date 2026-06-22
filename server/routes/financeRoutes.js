const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/summary', requireAuth, requirePermission('finance.view'), async (_request, response, next) => {
  try {
    response.json(await dataAdapter.getFinanceSummary())
  } catch (error) {
    next(error)
  }
})

router.get('/movements', requireAuth, requirePermission('finance.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('financeMovements') })
  } catch (error) {
    next(error)
  }
})

router.get('/movements/:id', requireAuth, requirePermission('finance.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('financeMovements', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/movements', requireAuth, requirePermission('finance.manage'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('financeMovements', 'fin', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/movements/:id', requireAuth, requirePermission('finance.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('financeMovements', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/movements/:id', requireAuth, requirePermission('finance.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('financeMovements', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/movements/:id', requireAuth, requirePermission('finance.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('financeMovements', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post(
  '/movements/:id/payment',
  requireAuth,
  requirePermission('finance.payments'),
  async (request, response, next) => {
    try {
      response.json(await dataAdapter.registerPayment(request.params.id, request.body || {}, request.currentUser))
    } catch (error) {
      next(error)
    }
  },
)

module.exports = router
