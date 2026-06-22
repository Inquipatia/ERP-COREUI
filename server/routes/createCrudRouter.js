const express = require('express')
const { createCrudController } = require('../controllers/crudController')
const { requirePermission } = require('../middleware/permissions')
const { prisma } = require('../services/prismaClient')

const createCrudRouter = ({ modelName, permissions, defaultOrderBy }) => {
  const router = express.Router()
  const controller = createCrudController({ prisma, modelName, defaultOrderBy })

  router.get('/', requirePermission(permissions.view), controller.list)
  router.get('/:id', requirePermission(permissions.view), controller.getById)
  router.post('/', requirePermission(permissions.manage), controller.create)
  router.put('/:id', requirePermission(permissions.manage), controller.update)
  router.patch('/:id', requirePermission(permissions.manage), controller.update)
  router.delete('/:id', requirePermission(permissions.manage), controller.remove)

  return router
}

module.exports = { createCrudRouter }
