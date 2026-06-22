const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'tender',
  permissions: { view: 'tenders.view', manage: 'tenders.analyze' },
})
