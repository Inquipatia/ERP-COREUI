const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'importJob',
  permissions: { view: 'admin.all', manage: 'admin.all' },
})
