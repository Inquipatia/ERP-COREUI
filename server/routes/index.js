const express = require('express')

const usersRouter = require('./users')
const clientsRouter = require('./clients')
const quotesRouter = require('./quotes')
const documentsRouter = require('./documents')
const tendersRouter = require('./tenders')
const workOrdersRouter = require('./workOrders')
const financeRouter = require('./finance')
const paymentsRouter = require('./payments')
const suppliersRouter = require('./suppliers')
const importsRouter = require('./imports')

const router = express.Router()

router.use('/users', usersRouter)
router.use('/clients', clientsRouter)
router.use('/quotes', quotesRouter)
router.use('/documents', documentsRouter)
router.use('/tenders', tendersRouter)
router.use('/work-orders', workOrdersRouter)
router.use('/finance', financeRouter)
router.use('/payments', paymentsRouter)
router.use('/suppliers', suppliersRouter)
router.use('/imports', importsRouter)

module.exports = router
