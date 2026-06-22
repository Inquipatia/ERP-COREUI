const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('quotes.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('quotes') })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('quotes.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('quotes', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('quotes.create'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('quotes', 'quote', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('quotes.edit'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('quotes', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('quotes.edit'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('quotes', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('quotes.edit'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('quotes', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post(
  '/:id/generate-receivable',
  requireAuth,
  requirePermission('finance.manage'),
  async (request, response, next) => {
    try {
      response.status(201).json(await dataAdapter.createReceivableFromQuote(request.params.id, request.currentUser))
    } catch (error) {
      next(error)
    }
  },
)

module.exports = router
