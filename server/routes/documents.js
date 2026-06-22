const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'document',
  permissions: { view: 'documents.view', manage: 'documents.manage' },
})
