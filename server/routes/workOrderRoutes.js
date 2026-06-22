const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('workorders.view'), async (_request, response, next) => {
  try {
    response.json({ items: await dataAdapter.list('workOrders') })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('workorders.create'), async (request, response, next) => {
  try {
    response.status(201).json(await dataAdapter.create('workOrders', 'wo', request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('workorders.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.findById('workOrders', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('workorders.create'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('workOrders', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('workorders.create'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.update('workOrders', request.params.id, request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('workorders.create'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('workOrders', request.params.id))
  } catch (error) {
    next(error)
  }
})

router.post('/:id/movement', requireAuth, requirePermission('workorders.create'), async (request, response, next) => {
  try {
    const workOrder = await dataAdapter.findById('workOrders', request.params.id)
    const movement = {
      id: `movement-${Date.now()}`,
      ...request.body,
      userName: request.currentUser.name,
      userEmail: request.currentUser.email,
      createdAt: new Date().toISOString(),
    }
    response.json(await dataAdapter.update('workOrders', request.params.id, {
      movements: [movement, ...(workOrder.movements || [])],
    }))
  } catch (error) {
    next(error)
  }
})

router.post('/:id/comment', requireAuth, requirePermission('workorders.view'), async (request, response, next) => {
  try {
    const workOrder = await dataAdapter.findById('workOrders', request.params.id)
    const comment = {
      id: `comment-${Date.now()}`,
      body: request.body?.body || request.body?.comment || '',
      userName: request.currentUser.name,
      userEmail: request.currentUser.email,
      createdAt: new Date().toISOString(),
    }
    response.json(await dataAdapter.update('workOrders', request.params.id, {
      comments: [comment, ...(workOrder.comments || [])],
    }))
  } catch (error) {
    next(error)
  }
})

module.exports = router
