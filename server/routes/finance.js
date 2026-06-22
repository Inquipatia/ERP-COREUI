const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'financialMovement',
  permissions: { view: 'finance.view', manage: 'finance.manage' },
})
