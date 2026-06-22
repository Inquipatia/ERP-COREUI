const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('tenders.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('tenders') })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('tenders.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('tenders', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('tenders.view'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('tenders', 'tender', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('tenders.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('tenders', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('tenders.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('tenders', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('tenders.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('tenders', request.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
