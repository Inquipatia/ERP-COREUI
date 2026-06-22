const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/login', async (request, response, next) => {
  try {
    response.json(await dataAdapter.login(request.body || {}))
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.currentUser })
})

module.exports = router
