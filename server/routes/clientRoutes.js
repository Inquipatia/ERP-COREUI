const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('clients.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('clients') })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('clients.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('clients', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('clients.manage'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('clients', 'client', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('clients.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('clients', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('clients.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('clients', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('clients.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('clients', request.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
