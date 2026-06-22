const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'payment',
  permissions: { view: 'finance.view', manage: 'finance.payments' },
})
