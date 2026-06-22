const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'workOrder',
  permissions: { view: 'workorders.view', manage: 'workorders.create' },
})
