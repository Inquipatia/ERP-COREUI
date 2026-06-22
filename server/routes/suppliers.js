const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'supplier',
  permissions: { view: 'suppliers.view', manage: 'suppliers.manage' },
})
