const express = require('express')
const dataAdapter = require('../services/dataAdapter')
const { requireAuth, requirePermission } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', requireAuth, requirePermission('dashboard.view'), async (request, response, next) => {
  try {
    response.json(await dataAdapter.getDashboard(request.currentUser))
  } catch (error) {
    next(error)
  }
})

module.exports = router
