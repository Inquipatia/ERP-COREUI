const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/login', async (request, response, next) => {
  try {
    response.json(await dataAdapter.login(request.body || {}))
  } catch (error) {
    if (error.statusCode === 401) {
      response.status(401).json({ error: 'Credenciales inválidas.' })
      return
    }

    if (error.statusCode === 503 || error.code?.startsWith?.('P')) {
      response.status(503).json({ error: 'No se pudo conectar con la base de datos.' })
      return
    }

    next(error)
  }
})

router.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.currentUser })
})

module.exports = router
