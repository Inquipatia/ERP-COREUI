const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('documents.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('documents') })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('documents.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('documents', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('documents.manage'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('documents', 'doc', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('documents.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('documents', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('documents.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('documents', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('documents.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('documents', request.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
