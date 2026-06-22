const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'client',
  permissions: { view: 'clients.view', manage: 'clients.manage' },
})
