const { createCrudRouter } = require('./createCrudRouter')

module.exports = createCrudRouter({
  modelName: 'quote',
  permissions: { view: 'quotes.view', manage: 'quotes.edit' },
})
