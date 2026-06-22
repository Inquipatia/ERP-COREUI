const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'user',
  permissions: { view: 'users.view', manage: 'users.manage' },
})
