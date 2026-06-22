const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('users.view'), async (_request, response, next) => {
  try {
    const users = await dataAdapter.list('users')
    response.json({ items: users.map(({ password, ...user }) => user) })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', requireAuth, requirePermission('users.view'), async (request, response, next) => {
  try {
    const { password, ...user } = await dataAdapter.findById('users', request.params.id)
    response.json(user)
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requirePermission('users.manage'), async (request, response, next) => {
  try {
    const user = await dataAdapter.create('users', 'usr', request.body || {})
    const { password, ...safeUser } = user
    response.status(201).json(safeUser)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireAuth, requirePermission('users.manage'), async (request, response, next) => {
  try {
    const user = await dataAdapter.update('users', request.params.id, request.body || {})
    const { password, ...safeUser } = user
    response.json(safeUser)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requirePermission('users.manage'), async (request, response, next) => {
  try {
    const user = await dataAdapter.update('users', request.params.id, request.body || {})
    const { password, ...safeUser } = user
    response.json(safeUser)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, requirePermission('users.manage'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.remove('users', request.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
