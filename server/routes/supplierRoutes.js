const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('suppliers.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('suppliers') })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('suppliers.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('suppliers', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('suppliers.manage'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('suppliers', 'sup', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('suppliers.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('suppliers', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('suppliers.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('suppliers', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('suppliers.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('suppliers', request.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
